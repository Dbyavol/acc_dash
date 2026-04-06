function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[char];
  });
}

const STORAGE_KEY = "acc-grid-ui-state";

function timeToMs(time) {
  if (!time || time === "0:00.000") {
    return null;
  }

  const [minutesPart, secondsPart] = time.split(":");

  if (!secondsPart) {
    return null;
  }

  const minutes = Number(minutesPart);
  const [secondsRaw, millisRaw] = secondsPart.split(".");
  const seconds = Number(secondsRaw);
  const millis = Number(millisRaw);

  if ([minutes, seconds, millis].some(Number.isNaN)) {
    return null;
  }

  return minutes * 60000 + seconds * 1000 + millis;
}

function formatGap(gapMs) {
  if (gapMs === null) {
    return "—";
  }

  const seconds = Math.floor(gapMs / 1000);
  const millis = String(gapMs % 1000).padStart(3, "0");

  return `+${seconds}.${millis}`;
}

const tracks = Object.keys(pilots[0].lapTimes);
const sortedPilots = [...pilots].sort((left, right) => {
  const leftNumber = Number(left.number.replace("#", ""));
  const rightNumber = Number(right.number.replace("#", ""));

  return leftNumber - rightNumber;
});

const state = {
  activeView: "cards",
  selectedTrack: tracks[0],
  selectedPilotNumber: sortedPilots[0]?.number || null,
  listView: "compact",
  searchQuery: "",
  skillFilter: "all",
  sortBy: "number-asc"
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw);

    if (typeof saved.activeView === "string") {
      state.activeView = saved.activeView;
    }

    if (typeof saved.selectedTrack === "string" && tracks.includes(saved.selectedTrack)) {
      state.selectedTrack = saved.selectedTrack;
    }

    if (
      typeof saved.selectedPilotNumber === "string" &&
      sortedPilots.some((pilot) => pilot.number === saved.selectedPilotNumber)
    ) {
      state.selectedPilotNumber = saved.selectedPilotNumber;
    }

    if (typeof saved.listView === "string") {
      state.listView = saved.listView;
    }

    if (typeof saved.searchQuery === "string") {
      state.searchQuery = saved.searchQuery;
    }

    if (typeof saved.skillFilter === "string") {
      state.skillFilter = saved.skillFilter;
    }

    if (typeof saved.sortBy === "string") {
      state.sortBy = saved.sortBy;
    }
  } catch (error) {
    console.warn("Не удалось восстановить состояние интерфейса.", error);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Не удалось сохранить состояние интерфейса.", error);
  }
}

const trackImageMap = {
  Barcelona: "assets/tracks/barcelona.png",
  "Brands Hatch": "assets/tracks/brands-hatch.svg",
  "Circuit of the Americas": "assets/tracks/circuit-of-the-americas.svg",
  Donington: "assets/tracks/donington.svg",
  Hungaroring: "assets/tracks/hungaroring.svg",
  Imola: "assets/tracks/imola.svg",
  Indianapolis: "assets/tracks/indianapolis.svg",
  Kyalami: "assets/tracks/kyalami.svg",
  "Laguna Seca": "assets/tracks/laguna-seca.svg",
  Misano: "assets/tracks/misano.svg",
  Monza: "assets/tracks/monza.svg",
  "Mount Panorama": "assets/tracks/mount-panorama.png",
  "Nurburgring Nordschleife": "assets/tracks/Nordschleife.png",
  "Nurburgring GP": "assets/tracks/nurburgring-gp.svg",
  "Oulton Park": "assets/tracks/oulton-park.svg",
  "Paul Ricard": "assets/tracks/paul-ricard.png",
  "Red Bull Ring": "assets/tracks/red-bull-ring.svg",
  Silverstone: "assets/tracks/silverstone.png",
  Snetterton: "assets/tracks/snetterton.svg",
  Spa: "assets/tracks/spa.svg",
  Suzuka: "assets/tracks/suzuka.svg",
  Valencia: "assets/tracks/valencia.svg",
  "Watkins Glen": "assets/tracks/watkins-glen.png",
  Zandvoort: "assets/tracks/zandvoort.png",
  Zolder: "assets/tracks/zolder.svg"
};

const trackInfoMap = {
  Barcelona:
    "Техническая испанская трасса рядом с Барселоной, известная длинной скоростной дугой и требовательностью к аэродинамике и балансу машины.",
  "Brands Hatch":
    "Классический британский трек в Кенте с резкими перепадами высот, слепыми входами и очень ритмичным быстрым кругом.",
  "Circuit of the Americas":
    "Современная трасса в Остине, вдохновленная несколькими легендарными поворотами других автодромов и сочетающая длинную прямую с техничным средним сектором.",
  Donington:
    "Английская трасса в Лестершире, где важны плавность, доверие к машине на скоростных дугах и стабильность на смене высот.",
  Hungaroring:
    "Плотный и извилистый венгерский автодром под Будапештом, часто сравниваемый с картинговым треком из-за непрерывной серии поворотов.",
  Imola:
    "Историческая итальянская трасса имени Энцо и Дино Феррари с быстрыми связками, агрессивными поребриками и выраженным характером старой школы.",
  Indianapolis:
    "Легендарный американский комплекс в Индианаполисе, где дорожная версия сочетает дух овала и техничные секции внутреннего кольца.",
  Kyalami:
    "Южноафриканский трек с большими перепадами высот, быстрыми дугами и сложным подбором ритма от первого до последнего сектора.",
  "Laguna Seca":
    "Калифорнийская трасса, знаменитая перепадом Corkscrew и коротким, но очень техничным кругом, где ошибка дорого стоит.",
  Misano:
    "Итальянский автодром у Адриатики с ровным асфальтом, частыми разгонами из медленных поворотов и важной работой на выходах.",
  Monza:
    "Легендарный храм скорости в Италии, где решают максимальная скорость, торможения в шиканах и уверенность на выходе из Lesmo и Parabolica.",
  "Mount Panorama":
    "Очень быстрый и узкий трек в Батерсте, сочетающий длинную прямую Conrod Straight и техничную горную секцию с минимальным запасом по ошибке.",
  "Nurburgring Nordschleife":
    "Длиннейшая и одна из самых сложных трасс мира, проходящая через лес Эйфель и требующая памяти, смелости и полной концентрации на всем круге.",
  "Nurburgring GP":
    "Современная гран-при конфигурация Нюрбургринга, где сочетаются жесткие торможения, медленные связки и хорошие возможности для борьбы.",
  "Oulton Park":
    "Узкий и техничный британский автодром в парковой зоне, где большое значение имеют точность траектории и работа машины на кочках и уклонах.",
  "Paul Ricard":
    "Французская трасса с длинной прямой Mistral, большим числом медленных поворотов и характерными цветными зонами вылета.",
  "Red Bull Ring":
    "Короткий австрийский трек с набором высоты в первой половине круга, мощными торможениями и быстрым завершающим сектором.",
  Silverstone:
    "Быстрый британский автодром на бывшем аэродроме, знаменитый связками Maggots, Becketts и Copse, где решают аэродинамика и уверенность на высокой скорости.",
  Snetterton:
    "Трасса в Норфолке с длинной прямой, смешанным ритмом круга и большим количеством разных по темпу поворотов.",
  Spa:
    "Одна из самых известных трасс мира в Арденнах, где длинный круг, погода и связка Eau Rouge - Raidillon делают каждый заезд особенным.",
  Suzuka:
    "Японская восьмерка с уникальной конфигурацией, высокоскоростными связками и очень большим штрафом за любые неточности.",
  Valencia:
    "Техническая испанская трасса имени Рикардо Тормо с плотной компоновкой, частыми сменами направления и акцентом на стабильность.",
  "Watkins Glen":
    "Американский трек в штате Нью-Йорк, известный быстрыми эссами, длинной прямой и хорошим сочетанием темпа и возможностей для атаки.",
  Zandvoort:
    "Нидерландская трасса среди дюн у Северного моря с выраженными уклонами, быстрыми поворотами и очень необычным чувством рельефа.",
  Zolder:
    "Компактный бельгийский автодром, где важны разгоны после шикан, работа на поребриках и стабильность под торможением."
};

const trackCountryMap = {
  Barcelona: { name: "Испания", code: "es" },
  "Brands Hatch": { name: "Великобритания", code: "gb" },
  "Circuit of the Americas": { name: "США", code: "us" },
  Donington: { name: "Великобритания", code: "gb" },
  Hungaroring: { name: "Венгрия", code: "hu" },
  Imola: { name: "Италия", code: "it" },
  Indianapolis: { name: "США", code: "us" },
  Kyalami: { name: "ЮАР", code: "za" },
  "Laguna Seca": { name: "США", code: "us" },
  Misano: { name: "Италия", code: "it" },
  Monza: { name: "Италия", code: "it" },
  "Mount Panorama": { name: "Австралия", code: "au" },
  "Nurburgring Nordschleife": { name: "Германия", code: "de" },
  "Nurburgring GP": { name: "Германия", code: "de" },
  "Oulton Park": { name: "Великобритания", code: "gb" },
  "Paul Ricard": { name: "Франция", code: "fr" },
  "Red Bull Ring": { name: "Австрия", code: "at" },
  Silverstone: { name: "Великобритания", code: "gb" },
  Snetterton: { name: "Великобритания", code: "gb" },
  Spa: { name: "Бельгия", code: "be" },
  Suzuka: { name: "Япония", code: "jp" },
  Valencia: { name: "Испания", code: "es" },
  "Watkins Glen": { name: "США", code: "us" },
  Zandvoort: { name: "Нидерланды", code: "nl" },
  Zolder: { name: "Бельгия", code: "be" }
};

function getPilotNumberValue(pilot) {
  return Number(pilot.number.replace("#", ""));
}

function getFilteredPilots() {
  const query = state.searchQuery.trim().toLowerCase();

  return [...sortedPilots]
    .filter((pilot) => {
      const matchesSkill = state.skillFilter === "all" || pilot.skill === state.skillFilter;

      if (!matchesSkill) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [pilot.name, pilot.number, pilot.skill, pilot.equipment]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    })
    .sort((left, right) => {
      switch (state.sortBy) {
        case "number-desc":
          return getPilotNumberValue(right) - getPilotNumberValue(left);
        case "name-asc":
          return left.name.localeCompare(right.name, "ru");
        case "age-asc":
          return left.age - right.age;
        case "age-desc":
          return right.age - left.age;
        case "number-asc":
        default:
          return getPilotNumberValue(left) - getPilotNumberValue(right);
      }
    });
}

function buildTrackRecords() {
  return tracks.map((track) => {
    let best = null;

    sortedPilots.forEach((pilot) => {
      const time = pilot.lapTimes[track];
      const timeMs = timeToMs(time);

      if (timeMs === null) {
        return;
      }

      if (!best || timeMs < best.timeMs) {
        best = {
          track,
          time,
          timeMs,
          pilot: pilot.name,
          number: pilot.number
        };
      }
    });

    return {
      track,
      time: best ? best.time : "0:00.000",
      pilot: best ? `${best.pilot} (${best.number})` : "Нет времени"
    };
  });
}

function buildTrackLeaderboard(track) {
  return sortedPilots
    .map((pilot) => {
      const time = pilot.lapTimes[track];
      const timeMs = timeToMs(time);

      return {
        name: pilot.name,
        number: pilot.number,
        skill: pilot.skill,
        time,
        timeMs
      };
    })
    .sort((left, right) => {
      if (left.timeMs === null && right.timeMs === null) {
        return left.name.localeCompare(right.name, "ru");
      }

      if (left.timeMs === null) {
        return 1;
      }

      if (right.timeMs === null) {
        return -1;
      }

      return left.timeMs - right.timeMs;
    });
}

function renderPilotList() {
  const pilotList = document.querySelector("#pilot-list");
  const filteredPilots = getFilteredPilots();

  pilotList.className = `pilot-list pilot-list-${state.listView}`;

  if (!filteredPilots.length) {
    pilotList.innerHTML = `
      <div class="empty-state">
        <h3>Пилоты не найдены</h3>
        <p>Попробуйте изменить поиск, фильтр навыка или сортировку.</p>
      </div>
    `;
    return;
  }

  pilotList.innerHTML = filteredPilots
    .map((pilot) => {
      const compactMeta =
        state.listView === "compact"
          ? ""
          : `<span class="pilot-list-meta">${escapeHtml(pilot.skill)} · ${pilot.age} лет</span>`;

      const detailedBlock =
        state.listView === "detailed"
          ? `
            <div class="pilot-list-details">
              <span>${escapeHtml(pilot.equipment)}</span>
              <span>${escapeHtml(pilot.experience)}</span>
            </div>
          `
          : "";

      return `
        <button class="pilot-list-item" type="button" data-pilot-number="${escapeHtml(pilot.number)}">
          <div class="pilot-list-main">
            <span class="pilot-list-name">${escapeHtml(pilot.name)}</span>
            ${compactMeta}
            ${detailedBlock}
          </div>
          <span class="pilot-list-number">${escapeHtml(pilot.number)}</span>
        </button>
      `;
    })
    .join("");

  pilotList.querySelectorAll("[data-pilot-number]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPilotNumber = button.dataset.pilotNumber;
      renderPilotProfile();
      setActiveView("profile");
      saveState();
    });
  });
}

function renderPilotProfile() {
  const profileLayout = document.querySelector("#profile-layout");
  const pilot = sortedPilots.find((entry) => entry.number === state.selectedPilotNumber);

  if (!pilot) {
    profileLayout.innerHTML = "";
    return;
  }

  const achievementsBlock = pilot.achievements
    ? `
      <div class="info-panel">
        <h4>Достижения</h4>
        <p>${escapeHtml(pilot.achievements)}</p>
      </div>
    `
    : "";

  const lapRows = tracks
    .map(
      (track) => `
        <tr>
          <td>
            <button
              class="track-jump-button"
              type="button"
              data-track-jump="${escapeHtml(track)}"
            >
              ${escapeHtml(track)}
            </button>
          </td>
          <td>
            <button
              class="track-jump-button track-jump-time"
              type="button"
              data-track-jump="${escapeHtml(track)}"
            >
              ${escapeHtml(pilot.lapTimes[track])}
            </button>
          </td>
        </tr>
      `
    )
    .join("");

  profileLayout.innerHTML = `
    <article class="profile-card">
      <div class="pilot-card-header">
        <div>
          <h2>${escapeHtml(pilot.name)}</h2>
        </div>
        <div class="pilot-number">${escapeHtml(pilot.number)}</div>
      </div>

      <div class="pilot-highlights">
        <div class="stat-box">
          <span class="stat-label">Возраст</span>
          <strong>${pilot.age}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">Навык</span>
          <strong>${escapeHtml(pilot.skill)}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">Лицензия</span>
          <strong>${escapeHtml(pilot.license || "Не указана")}</strong>
        </div>
      </div>

      <div class="pilot-columns">
        <div class="info-panel">
          <h4>Опыт</h4>
          <p>${escapeHtml(pilot.experience)}</p>
        </div>

        <div class="info-panel">
          <h4>О себе</h4>
          <p>${escapeHtml(pilot.about)}</p>
        </div>

        <div class="info-panel">
          <h4>Стиль</h4>
          <p>${escapeHtml(pilot.style)}</p>
        </div>

        <div class="info-panel">
          <h4>Оборудование</h4>
          <p>${escapeHtml(pilot.equipment)}</p>
        </div>

        ${achievementsBlock}

        <div class="info-panel compact">
          <h4>Титулы</h4>
          <p>${escapeHtml(pilot.titles)}</p>
        </div>

        <div class="info-panel compact warning">
          <h4>Штрафные санкции</h4>
          <p>${escapeHtml(pilot.penalties)}</p>
        </div>
      </div>
    </article>

    <div class="records-card profile-laps-card">
      <div class="records-card-header">
        <div>
          <p class="pilot-tag">Lap Timing</p>
          <h3>Времена кругов</h3>
        </div>
        <div class="records-badge">${tracks.length} трасс</div>
      </div>

      <div class="records-table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th>Трасса</th>
              <th>Лучшее время</th>
            </tr>
          </thead>
          <tbody>${lapRows}</tbody>
        </table>
      </div>
    </div>
  `;

  profileLayout.querySelectorAll("[data-track-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTrack = button.dataset.trackJump;
      renderTrackSelector();
      renderTrackLeaderboard();
      setActiveView("tracks");
      saveState();
    });
  });
}

function renderTrackSelector() {
  const selector = document.querySelector("#track-selector");
  const bestRecords = buildTrackRecords();

  selector.innerHTML = bestRecords
    .map((record) => {
      const isActive = record.track === state.selectedTrack;

      return `
        <button
          class="track-button ${isActive ? "is-active" : ""}"
          type="button"
          data-track="${escapeHtml(record.track)}"
        >
          <span class="track-button-head">
            ${
              trackCountryMap[record.track]
                ? `
                  <img
                    class="track-button-flag"
                    src="https://flagcdn.com/h20/${trackCountryMap[record.track].code}.png"
                    alt="Флаг ${escapeHtml(trackCountryMap[record.track].name)}"
                    loading="lazy"
                  />
                `
                : ""
            }
            <span class="track-button-name">${escapeHtml(record.track)}</span>
          </span>
          <span class="track-button-meta">${escapeHtml(record.time)} · ${escapeHtml(record.pilot)}</span>
        </button>
      `;
    })
    .join("");

  selector.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTrack = button.dataset.track;
      renderTrackSelector();
      renderTrackLeaderboard();
      saveState();
    });
  });
}

function renderTrackLeaderboard() {
  const leaderboard = buildTrackLeaderboard(state.selectedTrack);
  const body = document.querySelector("#track-results-body");
  const title = document.querySelector("#track-table-title");
  const count = document.querySelector("#track-table-count");
  const summary = document.querySelector("#track-summary");
  const validTimes = leaderboard.filter((entry) => entry.timeMs !== null);
  const bestEntry = validTimes[0] || null;
  const leaderTime = bestEntry ? bestEntry.timeMs : null;
  const imagePath = trackImageMap[state.selectedTrack];
  const country = trackCountryMap[state.selectedTrack];
  const flagUrl = country ? `https://flagcdn.com/h24/${country.code}.png` : "";

  title.textContent = state.selectedTrack;
  count.textContent = `${leaderboard.length} пилота`;

  summary.innerHTML = `
    <div class="summary-card track-overview-card">
      <div class="track-map-layout">
        <div class="track-map-frame">
          <img
            class="track-map-image"
            src="${escapeHtml(imagePath)}"
            alt="Схема трассы ${escapeHtml(state.selectedTrack)}"
          />
        </div>
        <div class="track-map-meta">
          <p class="pilot-tag">Выбрана трасса</p>
          ${
            country
              ? `
                <div class="track-country-badge">
                  <img
                    class="track-country-flag"
                    src="${escapeHtml(flagUrl)}"
                    alt="Флаг ${escapeHtml(country.name)}"
                    loading="lazy"
                  />
                  <span>${escapeHtml(country.name)}</span>
                </div>
              `
              : ""
          }
          <h3>${escapeHtml(state.selectedTrack)}</h3>
          <p class="track-map-description">
            ${escapeHtml(trackInfoMap[state.selectedTrack] || "Краткое описание трассы пока не добавлено.")}
          </p>
        </div>
      </div>
    </div>
    <div class="summary-card compact-summary">
      <p class="pilot-tag">Заполнено результатов</p>
      <h3>${validTimes.length}</h3>
      <p class="summary-text">из ${leaderboard.length} пилотов имеют время на этой трассе.</p>
    </div>
  `;

  body.innerHTML = leaderboard
    .map((entry, index) => {
      const place = entry.timeMs === null ? "—" : String(index + 1);
      const time = entry.timeMs === null ? "Нет времени" : entry.time;
      const gap = entry.timeMs === null || leaderTime === null ? "—" : formatGap(entry.timeMs - leaderTime);

      return `
        <tr>
          <td>${place}</td>
          <td>${escapeHtml(entry.name)}</td>
          <td>${escapeHtml(entry.number)}</td>
          <td>${escapeHtml(time)}</td>
          <td>${escapeHtml(gap)}</td>
        </tr>
      `;
    })
    .join("");
}

function setActiveView(viewName) {
  state.activeView = viewName;

  document.querySelectorAll(".dashboard-view").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === viewName);
  });

  document.querySelectorAll("[data-view-target]").forEach((control) => {
    control.classList.toggle("is-active", control.dataset.viewTarget === viewName);
  });

  saveState();
}

function bindViewControls() {
  document.querySelectorAll("[data-view-target]").forEach((control) => {
    control.addEventListener("click", () => {
      setActiveView(control.dataset.viewTarget);
    });
  });
}

function bindProfileControls() {
  const backButton = document.querySelector("#back-to-list");

  backButton.addEventListener("click", () => {
    setActiveView("cards");
  });
}

function bindPilotToolbar() {
  const searchInput = document.querySelector("#pilot-search");
  const skillFilter = document.querySelector("#pilot-skill-filter");
  const sortSelect = document.querySelector("#pilot-sort");

  searchInput.value = state.searchQuery;
  skillFilter.value = state.skillFilter;
  sortSelect.value = state.sortBy;

  document.querySelectorAll("[data-list-view]").forEach((control) => {
    control.classList.toggle("is-active", control.dataset.listView === state.listView);
  });

  searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    renderPilotList();
    saveState();
  });

  skillFilter.addEventListener("change", (event) => {
    state.skillFilter = event.target.value;
    renderPilotList();
    saveState();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    renderPilotList();
    saveState();
  });

  document.querySelectorAll("[data-list-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.listView = button.dataset.listView;

      document.querySelectorAll("[data-list-view]").forEach((control) => {
        control.classList.toggle("is-active", control.dataset.listView === state.listView);
      });

      renderPilotList();
      saveState();
    });
  });
}

loadState();
renderPilotList();
renderPilotProfile();
renderTrackSelector();
renderTrackLeaderboard();
bindViewControls();
bindProfileControls();
bindPilotToolbar();
setActiveView(state.activeView);
