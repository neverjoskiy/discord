const { app } = require('electron');
const net = require('net');
const { EventEmitter } = require('events');

// Замените на свой ID приложения из Discord Developer Portal
// Создайте приложение на https://discord.com/developers/applications
const CLIENT_ID = '1108740133722800222';

class DiscordRPC extends EventEmitter {
  constructor() {
    super();
    this.socket = null;
    this.connected = false;
    this.clientId = CLIENT_ID;
    this.processId = process.pid;
    this.reconnectTimer = null;
    this.pipeId = 0;
    this.messageBuffer = Buffer.alloc(0);
  }

  async connect() {
    if (this.connected) return true;

    return new Promise((resolve) => {
      // Пробуем подключиться к разным pipe ID (Discord использует 0-9)
      const tryConnect = (pipeId = 0) => {
        if (pipeId > 9) {
          console.log('[DiscordRPC] Не найдено активное соединение Discord');
          this.scheduleReconnect();
          resolve(false);
          return;
        }

        const pipePath = `\\\\?\\pipe\\discord-ipc-${pipeId}`;
        console.log(`[DiscordRPC] Попытка подключения к ${pipePath}...`);
        
        this.socket = net.createConnection(pipePath, () => {
          this.connected = true;
          this.pipeId = pipeId;
          console.log(`[DiscordRPC] Подключено к Discord (pipe ${pipeId})`);
          this.emit('connected');
          
          // Отправляем handshake
          this.send(0, { v: 1, client_id: this.clientId });
          resolve(true);
        });

        this.socket.on('error', (err) => {
          console.log(`[DiscordRPC] Ошибка pipe ${pipeId}:`, err.message);
          this.socket = null;
          tryConnect(pipeId + 1);
        });

        this.socket.on('close', () => {
          console.log('[DiscordRPC] Отключено от Discord');
          this.connected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.socket.on('data', (data) => {
          this.handleData(data);
        });

        // Таймаут на подключение
        setTimeout(() => {
          if (!this.connected && this.socket) {
            this.socket.destroy();
            this.socket = null;
            tryConnect(pipeId + 1);
          }
        }, 2000);
      };

      tryConnect();
    });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    console.log('[DiscordRPC] Переподключение через 5 секунд...');
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, 5000);
  }

  send(opcode, data) {
    if (!this.socket || !this.connected) return false;

    const json = JSON.stringify(data);
    const header = Buffer.alloc(8);
    header.writeInt32LE(opcode, 0);
    header.writeInt32LE(Buffer.byteLength(json), 4);

    this.socket.write(Buffer.concat([header, Buffer.from(json)]));
    return true;
  }

  handleData(data) {
    // Добавляем данные в буфер
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
    
    // Обрабатываем все полные фреймы в буфере
    while (this.messageBuffer.length >= 8) {
      const opcode = this.messageBuffer.readInt32LE(0);
      const length = this.messageBuffer.readInt32LE(4);
      
      // Проверяем, есть ли весь фрейм в буфере
      if (this.messageBuffer.length < 8 + length) {
        break; // Ждём больше данных
      }
      
      try {
        const json = JSON.parse(this.messageBuffer.slice(8, 8 + length).toString());
        console.log('[DiscordRPC] Получено:', opcode, json);
        this.emit('message', opcode, json);
        
        // Обработка handshake ответа
        if (opcode === 0 && json.cmd === 'DISPATCH') {
          this.emit('ready');
        }
      } catch (e) {
        console.error('[DiscordRPC] Ошибка парсинга:', e);
      }
      
      // Удаляем обработанный фрейм из буфера
      this.messageBuffer = this.messageBuffer.slice(8 + length);
    }
  }

  // Handshake при подключении
  async handshake() {
    if (!this.connected) return false;

    return new Promise((resolve) => {
      const handler = (opcode, data) => {
        if (opcode === 0 && data.cmd === 'DISPATCH') {
          this.removeListener('message', handler);
          resolve(true);
        }
      };

      this.on('message', handler);

      this.send(0, {
        v: 1,
        client_id: this.clientId
      });

      setTimeout(() => {
        this.removeListener('message', handler);
        resolve(false);
      }, 2000);
    });
  }

  // Установка активности (Rich Presence)
  setActivity(activity = {}) {
    if (!this.connected) return false;

    const data = {
      cmd: 'SET_ACTIVITY',
      args: {
        pid: this.processId,
        activity: {
          type: 0, // 0 = Playing
          timestamps: activity.timestamps || {},
          assets: activity.assets || {},
          party: activity.party || {},
          secrets: activity.secrets || {},
          instance: activity.instance ?? true,
        }
      },
      nonce: Date.now().toString()
    };

    // Добавляем details и state если есть
    if (activity.details) data.args.activity.details = activity.details;
    if (activity.state) data.args.activity.state = activity.state;
    if (activity.name) data.args.activity.name = activity.name;

    return this.send(1, data);
  }

  // Очистка активности
  clearActivity() {
    if (!this.connected) return false;

    return this.send(1, {
      cmd: 'SET_ACTIVITY',
      args: { pid: this.processId },
      nonce: Date.now().toString()
    });
  }

  // Подписка на события
  subscribe(event, args) {
    if (!this.connected) return false;

    return this.send(1, {
      cmd: 'SUBSCRIBE',
      args,
      nonce: Date.now().toString()
    });
  }

  // Отписка от событий
  unsubscribe(event, args) {
    if (!this.connected) return false;

    return this.send(1, {
      cmd: 'UNSUBSCRIBE',
      args,
      nonce: Date.now().toString()
    });
  }

  // Подписка на события активности (для обнаружения игр)
  async subscribeToActivity() {
    if (!this.connected) return false;

    return new Promise((resolve) => {
      const handler = (opcode, data) => {
        if (data.cmd === 'DISPATCH' && data.evt === 'ACTIVITY_START') {
          this.removeListener('message', handler);
          resolve(data.data?.activity || null);
        }
      };

      this.on('message', handler);

      this.send(1, {
        cmd: 'SUBSCRIBE',
        args: { evt: 'ACTIVITY_START' },
        nonce: Date.now().toString()
      });

      setTimeout(() => {
        this.removeListener('message', handler);
        resolve(null);
      }, 2000);
    });
  }

  // Получение текущей активности (для тестирования)
  async getCurrentActivity() {
    if (!this.connected) return null;

    return new Promise((resolve) => {
      const handler = (opcode, data) => {
        if (data.cmd === 'DISPATCH') {
          this.removeListener('message', handler);
          resolve(data.data?.activity || null);
        }
      };

      this.on('message', handler);

      // Запрашиваем текущую активность
      this.send(1, {
        cmd: 'GET_CHANNEL',
        args: {},
        nonce: Date.now().toString()
      });

      setTimeout(() => {
        this.removeListener('message', handler);
        resolve(null);
      }, 2000);
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    
    this.connected = false;
    console.log('[DiscordRPC] Отключено');
  }
}

// Экземпляр для использования
const rpc = new DiscordRPC();

module.exports = {
  DiscordRPC,
  rpc,
  CLIENT_ID
};
