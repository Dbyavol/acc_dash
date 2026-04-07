# ACC Pilot Cards

Статичный сайт для GitHub Pages с двумя разделами:

- карточки пилотов;
- лучшие времена на трассах.

Теперь сайт работает в двух режимах:

- `Карточки` показывает состав пилотов;
- `Трассы` открывает список трасс и таблицу результатов по выбранной трассе.

## Где редактировать данные

Все пилоты и их времена хранятся в `data.js`.

- чтобы добавить нового пилота, создайте еще один объект в массиве `pilots`;
- чтобы поменять времена, обновите значения в `lapTimes`;
- карточки и таблица рекордов на странице пересобираются автоматически через `script.js`.

## Python API Client

В репозитории есть Python-скрипт `scripts/acc_server_api.py` для работы с Emperor Servers ACC Server Manager Web API.

Сначала создайте свой конфиг на основе примера:

- скопируйте `scripts/acc_server_api_config.example.json` в `scripts/acc_server_api_config.json`
- заполните `base_url`
- при необходимости добавьте `headers`, `cookies` и `defaults`

Примеры:

- `python scripts/acc_server_api.py healthcheck`
- `python scripts/acc_server_api.py results`
- `python scripts/acc_server_api.py races`
- `python scripts/acc_server_api.py standings`
- `python scripts/acc_server_api.py export-races`

## Раздел Гонок

Под раздел гонок подготовлены:

- `data/races.json` — файл данных для фронтенда;
- `scripts/fetch_races.py` — скрипт, который забирает последние гонки из API и обновляет `data/races.json`.

После заполнения `scripts/acc_server_api_config.json` достаточно запускать:

- `python scripts/fetch_races.py`

Сайт сам читает `data/races.json` и показывает гонки во вкладке `Гонки`.

Если API не открыт публично, можно передать заголовки и cookies:

- `--header "X-Example=VALUE"`
- `--cookie "session=VALUE"`

## Запуск локально

Откройте `index.html` в браузере.

## Публикация на GitHub Pages

1. Загрузите файлы репозитория на GitHub.
2. Откройте `Settings -> Pages`.
3. В `Build and deployment` выберите `Deploy from a branch`.
4. Укажите ветку с сайтом и папку `/ (root)`.
5. Сохраните настройки и дождитесь публикации.
