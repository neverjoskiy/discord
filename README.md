# 🎮 Discord App

[![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/neverjoskiy/discord)

> Discord в виде отдельного Electron-приложения с Discord RPC интеграцией

![Discord Preview](https://img.shields.io/badge/🎮-DISCORD-5865F2?style=for-the-badge)

---

## 📖 О проекте

**Discord App** — это Electron-приложение, которое предоставляет доступ к Discord в формате нативного десктопного приложения с поддержкой Discord Rich Presence.

### ✨ Особенности

- 🎯 **Отдельное окно** — быстрый доступ без открытия браузера
- 🎨 **Современный UI** — тёмная тема с плавными анимациями
- 🚀 **Discord RPC** — интеграция с Discord Rich Presence
- ⚙️ **Умная навигация** — кнопки назад/вперёд/обновить
- 📱 **Адаптивный интерфейс** — подстраивается под размер окна

---

## 🚀 Быстрый старт

### Установка

1. **Скачайте установщик** из [Releases](https://github.com/neverjoskiy/discord/releases)
2. Запустите `Discord Setup.exe`
3. Следуйте инструкциям установщика

### 🔧 Сборка из исходников

```bash
# Клонирование репозитория
git clone https://github.com/neverjoskiy/discord.git
cd discord

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm start

# Сборка установщика
npm run build
```

---

## 📋 Требования

| Компонент | Версия |
|-----------|--------|
| ОС | Windows 10/11 (x64) |
| RAM | Минимум 512 MB |
| Место на диске | ~150 MB |

---

## 🎮 Управление

### Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| `F5` / `Ctrl+R` | Обновить страницу |
| `Alt+←` | Назад |
| `Alt+→` | Вперёд |
| `Alt+Home` | На главную |
| `Ctrl+W` | Закрыть приложение |

---

## 🛠️ Разработка

### Структура проекта

```
discord/
├── main.js           # Главный процесс Electron
├── preload.js        # Preload скрипт
├── discord-rpc.js    # Discord Rich Presence
├── index.html        # Основной интерфейс
├── package.json      # Конфигурация и зависимости
└── README.md
```

### Изменение иконки

Для замены иконки приложения:

1. Подготовьте `.ico` файл с размерами: 16×16, 32×32, 48×48, 64×64, 128×128, 256×256
2. Обновите путь к иконке в конфигурации `electron-builder`
3. Пересоберите приложение: `npm run build`

> 💡 **Важно:** Для Windows требуется формат `.ico`. PNG не будет работать в установщике!

---

## ⚠️ Отказ от ответственности

Данная программа предоставляется **"как есть"** (as-is) без каких-либо гарантий.

- Программа **не предназначена для коммерческого использования**
- Программа **официально не связана с Discord Inc.** и является независимым проектом
- Все права на платформу Discord принадлежат её владельцам

---

## 📝 Лицензия

ISC License

---

## 👤 Автор

| Контакт | Ссылка |
|---------|--------|
| **GitHub** | [neverjoskiy](https://github.com/neverjoskiy) |
| **Telegram** | [bioneverr](https://t.me/bioneverr) |

---

## 🙏 Благодарности

- [Electron](https://www.electronjs.org/) — фреймворк для создания кроссплатформенных приложений
- [Discord](https://discord.com/) — платформа для общения
- [electron-builder](https://www.electron.build/) — инструмент для сборки приложений

---

<div align="center">

**Made with ❤️ for the Discord community**

[⬆️ Вернуться наверх](#-discord-app)

</div>
