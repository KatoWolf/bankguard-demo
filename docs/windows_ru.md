# Запуск на Windows без опыта разработки

1. Установить Node.js LTS с https://nodejs.org/ (официальный сайт). Закрыть и снова открыть терминал.
2. На GitHub выбрать **Code → Download ZIP**, распаковать архив полностью. Либо использовать `git clone`, если Git уже установлен.
3. Открыть папку, в которой находятся `package.json` и `server.js`. В адресной строке Проводника написать `cmd` и нажать Enter.
4. Выполнить `node --version`. Требуется версия 20 или выше. Затем `npm.cmd start`.
5. Открыть http://localhost:3000 в браузере. Окно терминала оставить открытым. Для остановки нажать Ctrl+C.

Не запускать файлы прямо внутри ZIP. Не открывать index.html двойным щелчком. `npm install` не нужен: сторонних пакетов нет.

## Если что-то не запускается

- **node не найден:** установить Node.js и заново открыть терминал.
- **ENOENT / package.json не найден:** перейти в распакованную папку с package.json.
- **PowerShell запрещает npm.ps1:** использовать `npm.cmd start`, `npm.cmd test`, `npm.cmd run build`. Не нужно отключать политику безопасности PowerShell.
- **EADDRINUSE / порт занят:** `npm.cmd start -- --port 3001`, затем http://localhost:3001.
- **Пустая страница при file://:** запустить сервер и использовать адрес http://localhost:3000.

## Проверка перед защитой

```
npm.cmd test
npm.cmd run build
npm.cmd run demo:verify
```

Чистый JSON: `node scripts/verify-demo.js > demo-report.json` в cmd. В PowerShell кодировка перенаправления зависит от версии; JSON-сессию лучше сохранять кнопкой приложения. Импорт поддерживает JSON в UTF-8, включая UTF-8 BOM, но не UTF-16. Для ошибочного файла интерфейс показывает сообщение и сохраняет текущую сессию.

Windows runner CI проверяет тесты и сборку; это не подтверждение ручной браузерной проверки Windows. Инструкция демонстрации: [demo_walkthrough_ru.md](demo_walkthrough_ru.md).
