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
const UI_STATE_VERSION = 2;
const DEFAULT_PILOT_SORT = "races-desc";

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

const siteData = window.__ACC_SITE_DATA__ || {};
const announcementsFeed = window.__ACC_ANNOUNCEMENTS__ || {
  discordUrl: "https://discord.gg/accru",
  announcements: []
};
const dataPilots =
  Array.isArray(siteData.pilots) && siteData.pilots.length
    ? siteData.pilots
    : pilots;
const tracks =
  Array.isArray(siteData.tracks) && siteData.tracks.length
    ? siteData.tracks
    : Object.keys(dataPilots[0].lapTimes);
const sortedPilots = [...dataPilots].sort((left, right) => {
  const leftNumber = Number(String(left.number || "").replace("#", ""));
  const rightNumber = Number(String(right.number || "").replace("#", ""));

  return (Number.isNaN(leftNumber) ? 9999 : leftNumber) - (Number.isNaN(rightNumber) ? 9999 : rightNumber);
});

const state = {
  activeView: "cards",
  selectedTrack: tracks[0],
  selectedPilotNumber: sortedPilots[0]?.id || null,
  selectedRaceId: null,
  selectedRaceSessions: {},
  listView: "compact",
  searchQuery: "",
  trackSearchQuery: "",
  raceSearchQuery: "",
  raceDateFrom: "",
  raceDateTo: "",
  profileResultsPage: 1,
  skillFilter: "all",
  sortBy: DEFAULT_PILOT_SORT
};

let racesFeed = {
  updated_at: siteData.updated_at || null,
  count: Array.isArray(siteData.races) ? siteData.races.length : 0,
  races: Array.isArray(siteData.races) ? siteData.races : []
};

function getNavigationSnapshot() {
  return {
    activeView: state.activeView,
    selectedTrack: state.selectedTrack,
    selectedPilotNumber: state.selectedPilotNumber,
    selectedRaceId: state.selectedRaceId,
    selectedRaceSessions: { ...state.selectedRaceSessions },
    profileResultsPage: state.profileResultsPage
  };
}

function pushNavigationState() {
  if (!window.history?.pushState) {
    return;
  }

  history.pushState(getNavigationSnapshot(), "", window.location.href);
}

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
      sortedPilots.some((pilot) => pilot.id === saved.selectedPilotNumber)
    ) {
      state.selectedPilotNumber = saved.selectedPilotNumber;
    }

    if (typeof saved.selectedRaceId === "string") {
      state.selectedRaceId = saved.selectedRaceId;
    }

    if (saved.selectedRaceSessions && typeof saved.selectedRaceSessions === "object") {
      state.selectedRaceSessions = saved.selectedRaceSessions;
    }

    if (typeof saved.listView === "string") {
      state.listView = saved.listView;
    }

    if (typeof saved.searchQuery === "string") {
      state.searchQuery = saved.searchQuery;
    }

    if (typeof saved.trackSearchQuery === "string") {
      state.trackSearchQuery = saved.trackSearchQuery;
    }

    if (typeof saved.raceSearchQuery === "string") {
      state.raceSearchQuery = saved.raceSearchQuery;
    }

    if (typeof saved.raceDateFrom === "string") {
      state.raceDateFrom = saved.raceDateFrom;
    }

    if (typeof saved.raceDateTo === "string") {
      state.raceDateTo = saved.raceDateTo;
    }

    if (typeof saved.profileResultsPage === "number") {
      state.profileResultsPage = saved.profileResultsPage;
    }

    if (typeof saved.skillFilter === "string") {
      state.skillFilter = saved.skillFilter;
    }

    if (saved.uiStateVersion >= UI_STATE_VERSION && typeof saved.sortBy === "string") {
      state.sortBy = saved.sortBy;
    }

  } catch (error) {
    console.warn("Не удалось восстановить состояние интерфейса.", error);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      uiStateVersion: UI_STATE_VERSION
    }));
  } catch (error) {
    console.warn("Не удалось сохранить состояние интерфейса.", error);
  }
}

function getRaceId(race) {
  if (race.id) {
    return race.id;
  }

  if (race.session_file) {
    return race.session_file;
  }

  return `${race.track || "race"}-${race.date || "unknown"}`;
}

function formatRaceTrackLabel(race) {
  if (race.track_label) {
    return race.track_label;
  }

  if (!race.track) {
    return "Неизвестная трасса";
  }

  return race.track
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatRaceTotalTime(value) {
  return value || "—";
}

function formatSessionCode(value) {
  const labels = {
    FP: "FP",
    Q: "Q",
    R: "R",
    race: "R",
    qualifying: "Q",
    practice: "FP"
  };

  return labels[value] || value || "—";
}

function formatSessionHint(value) {
  const labels = {
    FP: "Время поставлено в практике",
    Q: "Время поставлено в квалификации",
    R: "Время поставлено в гонке",
    race: "Время поставлено в гонке",
    qualifying: "Время поставлено в квалификации",
    practice: "Время поставлено в практике"
  };

  return labels[value] || "Источник времени не указан";
}

function getSessionChipClass(value) {
  const type = formatSessionCode(value).toLowerCase();

  if (["r", "q", "fp"].includes(type)) {
    return `session-source-chip-${type}`;
  }

  return "session-source-chip-unknown";
}

function getRaceSession(race) {
  const sessions = race.sessions || {};
  const requestedType = state.selectedRaceSessions[race.id] || "race";
  const practiceSession = Array.isArray(sessions.practices) ? sessions.practices[0] : sessions.practice;

  if (requestedType === "qualifying" && sessions.qualifying) {
    return { type: "qualifying", label: "Квалификация", session: sessions.qualifying };
  }

  if (requestedType === "practice" && practiceSession) {
    return { type: "practice", label: "Практика", session: practiceSession };
  }

  if (sessions.race) {
    return { type: "race", label: "Гонка", session: sessions.race };
  }

  if (sessions.qualifying) {
    return { type: "qualifying", label: "Квалификация", session: sessions.qualifying };
  }

  if (practiceSession) {
    return { type: "practice", label: "Практика", session: practiceSession };
  }

  return { type: "race", label: "Гонка", session: race };
}

function getRaceSessionEntries(race) {
  const { session } = getRaceSession(race);
  const entries = Array.isArray(session.entries) ? session.entries : [];

  return entries.filter((entry) => Number(entry.lap_count ?? 0) > 0);
}

function openPilotProfile(pilotId) {
  if (!pilotId || !sortedPilots.some((pilot) => pilot.id === pilotId)) {
    return;
  }

  state.selectedPilotNumber = pilotId;
  state.profileResultsPage = 1;
  renderPilotProfile();
  navigateToView("profile");
  saveState();
}

function clearRaceFilters() {
  state.raceSearchQuery = "";
  state.raceDateFrom = "";
  state.raceDateTo = "";

  const raceSearch = document.querySelector("#race-search");
  const raceDateFrom = document.querySelector("#race-date-from");
  const raceDateTo = document.querySelector("#race-date-to");

  if (raceSearch) {
    raceSearch.value = "";
  }

  if (raceDateFrom) {
    raceDateFrom.value = "";
  }

  if (raceDateTo) {
    raceDateTo.value = "";
  }
}

function scrollToRaceCard(raceId) {
  requestAnimationFrame(() => {
    const escapeSelector =
      window.CSS && typeof window.CSS.escape === "function"
        ? window.CSS.escape(raceId)
        : raceId.replace(/["\\]/g, "\\$&");
    const card = document.querySelector(`[data-race-card-id="${escapeSelector}"]`);

    if (!card) {
      return;
    }

    card.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function openRaceResults(raceId, sessionType = "race") {
  if (!raceId || !racesFeed.races.some((race) => getRaceId(race) === raceId)) {
    return;
  }

  clearRaceFilters();
  state.selectedRaceId = raceId;
  state.selectedRaceSessions[raceId] = sessionType;
  renderRaces();
  navigateToView("races");
  scrollToRaceCard(raceId);
  saveState();
}

function openSessionSource(source) {
  if (!source?.session_file) {
    return;
  }

  const sourceType = formatSessionCode(source.session_type);
  const sessionType =
    sourceType === "Q"
      ? "qualifying"
      : sourceType === "FP"
        ? "practice"
        : "race";
  const race = racesFeed.races.find((candidate) => {
    const sessions = candidate.sessions || {};
    const practiceSessions = Array.isArray(sessions.practices) ? sessions.practices : [];

    return (
      sessions.race?.session_file === source.session_file ||
      sessions.qualifying?.session_file === source.session_file ||
      practiceSessions.some((practice) => practice.session_file === source.session_file)
    );
  });

  if (!race) {
    return;
  }

  openRaceResults(getRaceId(race), sessionType);
}

function formatRaceGapToLeader(entry, leaderEntry) {
  if (!leaderEntry) {
    return "—";
  }

  const leaderLaps = Number(leaderEntry.lap_count ?? 0);
  const entryLaps = Number(entry.lap_count ?? 0);

  if (leaderLaps > 0 && entryLaps > 0 && leaderLaps !== entryLaps) {
    const lapGap = leaderLaps - entryLaps;
    if (lapGap <= 0) {
      return "—";
    }

    const mod10 = lapGap % 10;
    const mod100 = lapGap % 100;
    let lapWord = "кругов";

    if (mod10 === 1 && mod100 !== 11) {
      lapWord = "круг";
    } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      lapWord = "круга";
    }

    return `+${lapGap} ${lapWord}`;
  }

  const leaderTimeMs = leaderEntry.total_time_ms ?? null;
  const entryTimeMs = entry.total_time_ms ?? null;

  if (leaderTimeMs === null || entryTimeMs === null) {
    return "—";
  }

  const gapMs = Math.max(0, entryTimeMs - leaderTimeMs);
  const minutes = Math.floor(gapMs / 60000);
  const seconds = Math.floor((gapMs % 60000) / 1000);
  const millis = String(gapMs % 1000).padStart(3, "0");

  if (minutes > 0) {
    return `+${minutes}:${String(seconds).padStart(2, "0")}.${millis}`;
  }

  return `+${seconds}.${millis}`;
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
  const value = Number(String(pilot.number || "").replace("#", ""));
  return Number.isNaN(value) ? 9999 : value;
}

function getFilteredPilots() {
  const query = state.searchQuery.trim().toLowerCase();

  return [...sortedPilots]
    .filter((pilot) => {
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
        case "races-desc":
          return (right.stats?.races || 0) - (left.stats?.races || 0);
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

function findEntryCarForSource(pilotId, source) {
  if (source?.car_model_name) {
    return source.car_model_name;
  }

  if (source?.car_model !== undefined && source.car_model !== null) {
    return `Car #${source.car_model}`;
  }

  if (!pilotId || !source?.session_file) {
    return null;
  }

  for (const race of racesFeed.races) {
    const sessions = race.sessions || {};
    const candidates = [
      sessions.race,
      sessions.qualifying,
      ...(Array.isArray(sessions.practices) ? sessions.practices : [])
    ].filter(Boolean);

    const session = candidates.find((candidate) => candidate.session_file === source.session_file);

    if (!session || !Array.isArray(session.entries)) {
      continue;
    }

    const entry = session.entries.find((candidate) => candidate.pilot_id === pilotId);

    if (entry) {
      return entry.car_model_name || `Car #${entry.car_model ?? "—"}`;
    }
  }

  return null;
}

function buildTrackLeaderboard(track) {
  return sortedPilots
    .map((pilot) => {
      const time = pilot.lapTimes[track];
      const timeMs = timeToMs(time);
      const source = pilot.lapTimeSources?.[track] || null;

      return {
        id: pilot.id,
        name: pilot.name,
        number: pilot.number,
        skill: pilot.skill,
        time,
        timeMs,
        source,
        car: findEntryCarForSource(pilot.id, source)
      };
    })
    .filter((entry) => entry.timeMs !== null)
    .sort((left, right) => {
      return left.timeMs - right.timeMs;
    });
}

function formatRaceDate(value) {
  if (!value) {
    return "Дата не указана";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("ru-RU");
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatAnnouncementDate(value, weekday) {
  if (!value) {
    return "Дата не указана";
  }

  const [year, month, day] = value.split("-").map(Number);

  if ([year, month, day].some(Number.isNaN)) {
    return value;
  }

  const formatted = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(year, month - 1, day));

  return weekday ? `${formatted}, ${weekday}` : formatted;
}

function getUpcomingAnnouncements() {
  const today = getLocalDateKey();
  const announcements = Array.isArray(announcementsFeed.announcements)
    ? announcementsFeed.announcements
    : [];

  return announcements
    .filter((announcement) => typeof announcement.date === "string" && announcement.date >= today)
    .sort((left, right) => left.date.localeCompare(right.date));
}

function renderAnnouncements() {
  const list = document.querySelector("#announcements-list");
  const count = document.querySelector("#announcements-count");

  if (!list) {
    return;
  }

  const announcements = getUpcomingAnnouncements();

  if (count) {
    count.textContent = `${announcements.length} ${announcements.length === 1 ? "событие" : "событий"}`;
  }

  if (!announcements.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Будущих анонсов пока нет</h3>
        <p>Когда появится новая гонка, добавьте ее в папку data/announcements, и она появится здесь автоматически до даты события.</p>
      </div>
    `;
    return;
  }

  const discordUrl = announcementsFeed.discordUrl || "https://discord.gg/accru";
  const liveryPackUrl = announcementsFeed.liveryPackUrl || "";

  list.innerHTML = announcements
    .map((announcement) => {
      const sessions = Array.isArray(announcement.sessions) ? announcement.sessions : [];
      const rules = Array.isArray(announcement.rules) ? announcement.rules : [];
      const notes = Array.isArray(announcement.notes) ? announcement.notes : [];
      const trackImage = announcement.track ? trackImageMap[announcement.track] : "";
      const country = announcement.track ? trackCountryMap[announcement.track] : null;
      const flagUrl = country ? `https://flagcdn.com/h24/${country.code}.png` : "";

      return `
        <article class="announcement-card">
          <div class="announcement-main">
            <div class="announcement-date">
              <span>${escapeHtml(formatAnnouncementDate(announcement.date, announcement.weekday))}</span>
            </div>
            <h3>
              ${
                flagUrl
                  ? `
                    <span class="announcement-country-badge">
                      <img src="${escapeHtml(flagUrl)}" alt="Флаг ${escapeHtml(country.name)}" loading="lazy" />
                    </span>
                  `
                  : `<span class="announcement-flag">${escapeHtml(announcement.flag || "")}</span>`
              }
              ${escapeHtml(announcement.track || "Трасса уточняется")}
            </h3>
            ${
              trackImage
                ? `
                  <div class="announcement-track-map">
                    <button
                      class="track-map-open-button"
                      type="button"
                      data-map-viewer-src="${escapeHtml(trackImage)}"
                      data-map-viewer-title="${escapeHtml(announcement.track)}"
                    >
                      <img src="${escapeHtml(trackImage)}" alt="Схема трассы ${escapeHtml(announcement.track)}" loading="lazy" />
                      <span>Открыть схему</span>
                    </button>
                  </div>
                `
                : ""
            }
          </div>

          <div class="announcement-schedule">
            ${sessions
              .map(
                (session) => `
                  <div class="announcement-session">
                    <span>${escapeHtml(session.label || "Сессия")}</span>
                    <strong>${escapeHtml(session.time || "Время уточняется")}</strong>
                  </div>
                `
              )
              .join("")}
          </div>

          ${
            rules.length || notes.length
              ? `
                <div class="announcement-details">
                  ${rules.map((rule) => `<p class="announcement-rule">${escapeHtml(rule)}</p>`).join("")}
                  ${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
                </div>
              `
              : ""
          }

          <div class="announcement-actions">
            ${
              liveryPackUrl
                ? `
                  <a class="announcement-action announcement-livery-link" href="${escapeHtml(liveryPackUrl)}" target="_blank" rel="noreferrer" aria-label="Скачать пак ливрей">
                    <span class="announcement-action-icon" aria-hidden="true">⬇</span>
                    <span>Пак ливрей</span>
                  </a>
                `
                : ""
            }
            <a class="announcement-action announcement-discord-link" href="${escapeHtml(discordUrl)}" target="_blank" rel="noreferrer" aria-label="Получить пароль в Discord">
              <span class="announcement-action-icon" aria-hidden="true">#</span>
              <span>Discord</span>
            </a>
          </div>
        </article>
      `;
    })
    .join("");
}

function getRaceDateKey(race) {
  const parsed = new Date(race.date);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
}

function getFilteredRaces() {
  const query = state.raceSearchQuery.trim().toLowerCase();

  return racesFeed.races.filter((race) => {
    const track = formatRaceTrackLabel(race).toLowerCase();
    const raceDate = getRaceDateKey(race);

    if (query && !track.includes(query)) {
      return false;
    }

    if (state.raceDateFrom && raceDate && raceDate < state.raceDateFrom) {
      return false;
    }

    if (state.raceDateTo && raceDate && raceDate > state.raceDateTo) {
      return false;
    }

    return true;
  });
}

function getPilotPodiumCounts(pilot) {
  return (pilot.recentResults || []).reduce(
    (counts, result) => {
      if (result.position === 1) {
        counts.gold += 1;
      }
      if (result.position === 2) {
        counts.silver += 1;
      }
      if (result.position === 3) {
        counts.bronze += 1;
      }
      return counts;
    },
    { gold: 0, silver: 0, bronze: 0 }
  );
}

function renderPodiumCups(pilot) {
  const counts = getPilotPodiumCounts(pilot);
  const cups = [
    ["gold", "P1", counts.gold],
    ["silver", "P2", counts.silver],
    ["bronze", "P3", counts.bronze]
  ].filter(([, , count]) => count > 0);

  if (!cups.length) {
    return "";
  }

  return `
    <div class="podium-cups" aria-label="Подиумы пилота">
      ${cups
        .map(
          ([type, label, count]) => `
            <span class="podium-cup">
              <span class="podium-cup-badge podium-cup-${type}">${label}</span>
              <span class="podium-cup-count">x ${count}</span>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function getPodiumRank(position) {
  const rank = Number(position);

  return rank >= 1 && rank <= 3 ? rank : null;
}

function getPilotTrackMedals(pilot) {
  return tracks
    .map((track) => {
      const rank = buildTrackLeaderboard(track).findIndex((entry) => entry.id === pilot.id) + 1;
      if (rank < 1 || rank > 3) {
        return null;
      }
      return { track, rank };
    })
    .filter(Boolean);
}

function getPilotRaceMedals(pilot) {
  return (pilot.recentResults || [])
    .filter((result) => getPodiumRank(result.position))
    .map((result) => ({
      raceId: result.race_id,
      track: result.track || "Гонка",
      date: result.date,
      rank: result.position
    }));
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
      const podiumCups = renderPodiumCups(pilot);

      return `
        <button class="pilot-list-item" type="button" data-pilot-id="${escapeHtml(pilot.id)}">
          <div class="pilot-list-main">
            <span class="pilot-list-name">${escapeHtml(pilot.name)}</span>
            ${compactMeta}
            ${podiumCups}
            ${detailedBlock}
          </div>
          <span class="pilot-list-number">${escapeHtml(pilot.number)}</span>
        </button>
      `;
    })
    .join("");

  pilotList.querySelectorAll("[data-pilot-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPilotNumber = button.dataset.pilotId;
      renderPilotProfile();
      navigateToView("profile");
      saveState();
    });
  });
}

function renderPilotProfile() {
  const profileLayout = document.querySelector("#profile-layout");
  const pilot = sortedPilots.find((entry) => entry.id === state.selectedPilotNumber);

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

  const completedTracks = tracks.filter((track) => timeToMs(pilot.lapTimes[track]) !== null);
  const lapTracks = completedTracks;
  const trackRanks = Object.fromEntries(
    tracks.map((track) => [
      track,
      buildTrackLeaderboard(track).findIndex((entry) => entry.id === pilot.id) + 1
    ])
  );
  const lapRows = lapTracks.length
    ? lapTracks
    .map(
      (track) => {
        const trackRank = trackRanks[track];
        const podiumRank = getPodiumRank(trackRank);
        const positionClass = podiumRank ? ` result-position-podium result-position-podium-${podiumRank}` : "";

        return `
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
            <td>
              <span class="result-position-badge${positionClass}">
                ${trackRank > 0 ? `P${trackRank}` : "—"}
              </span>
            </td>
          </tr>
        `;
      }
    )
    .join("")
    : `
      <tr>
        <td colspan="3" class="race-results-empty">У пилота пока нет зафиксированных времен.</td>
      </tr>
    `;
  const trackMedals = getPilotTrackMedals(pilot);
  const raceMedals = getPilotRaceMedals(pilot);
  const trackMedalsBlock = trackMedals.length
    ? `
      <div class="track-medals">
        ${trackMedals
          .map(
            (medal) => `
              <button
                class="track-medal track-medal-${medal.rank}"
                type="button"
                data-track-jump="${escapeHtml(medal.track)}"
              >
                <span class="track-medal-rank">P${medal.rank}</span>
                <span>${escapeHtml(medal.track)}</span>
              </button>
            `
          )
          .join("")}
      </div>
    `
    : "";
  const raceMedalsBlock = raceMedals.length
    ? `
      <div class="track-medals race-medals">
        ${raceMedals
          .map(
            (medal) => `
              <button
                class="track-medal race-medal track-medal-${medal.rank}"
                type="button"
                data-race-jump="${escapeHtml(medal.raceId)}"
              >
                <span class="track-medal-rank">P${medal.rank}</span>
                <span>${escapeHtml(medal.track)}</span>
                <span class="race-medal-date">${escapeHtml(formatRaceDate(medal.date))}</span>
              </button>
            `
          )
          .join("")}
      </div>
    `
    : "";
  const recentResults = Array.isArray(pilot.recentResults) ? pilot.recentResults : [];
  const resultsPerPage = 5;
  const totalResultPages = Math.max(1, Math.ceil(recentResults.length / resultsPerPage));
  state.profileResultsPage = Math.min(Math.max(1, state.profileResultsPage), totalResultPages);
  const visibleRecentResults = recentResults.slice(
    (state.profileResultsPage - 1) * resultsPerPage,
    state.profileResultsPage * resultsPerPage
  );
  const recentResultRows = visibleRecentResults.length
    ? visibleRecentResults
        .map(
          (result) => {
            const podiumRank = getPodiumRank(result.position);
            const positionClass = podiumRank ? ` result-position-podium result-position-podium-${podiumRank}` : "";

            return `
              <tr>
                <td>${escapeHtml(formatRaceDate(result.date))}</td>
                <td>
                  <button
                    class="inline-nav-button"
                    type="button"
                    data-race-jump="${escapeHtml(result.race_id)}"
                  >
                    ${escapeHtml(result.track || "—")}
                  </button>
                </td>
                <td>
                  <span class="result-position-badge${positionClass}">
                    ${escapeHtml(result.position ? `P${result.position}` : "—")}
                  </span>
                </td>
                <td>${escapeHtml(String(result.lap_count ?? "—"))}</td>
                <td>${escapeHtml(result.best_lap || "—")}</td>
              </tr>
            `;
          }
        )
        .join("")
    : `
      <tr>
        <td colspan="5" class="race-results-empty">Недавних результатов пока нет.</td>
      </tr>
    `;
  const carStatsRows = Array.isArray(pilot.carStats) && pilot.carStats.length
    ? pilot.carStats.slice(0, 5).map((car) => `
        <tr>
          <td>${escapeHtml(car.car_model_name || `Car #${car.car_model ?? "—"}`)}</td>
          <td>${escapeHtml(String(car.sessions ?? 0))}</td>
          <td>${escapeHtml(String(car.laps ?? 0))}</td>
        </tr>
      `).join("")
    : `
      <tr>
        <td colspan="3" class="race-results-empty">Статистики по машинам пока нет.</td>
      </tr>
    `;

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
        <div class="stat-box">
          <span class="stat-label">Трассы</span>
          <strong>${completedTracks.length}/${tracks.length}</strong>
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

        ${
          trackMedalsBlock
            ? `
              <div class="info-panel compact track-medals-panel">
                <h4>Медали трасс</h4>
                ${trackMedalsBlock}
              </div>
            `
            : ""
        }

        ${
          raceMedalsBlock
            ? `
              <div class="info-panel compact track-medals-panel">
                <h4>Медали гонок</h4>
                ${raceMedalsBlock}
              </div>
            `
            : ""
        }

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
        <div class="lap-card-actions">
          <div class="records-badge">${completedTracks.length}/${tracks.length} трасс</div>
        </div>
      </div>

      <div class="records-table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th>Трасса</th>
              <th>Лучшее время</th>
              <th>Позиция</th>
            </tr>
          </thead>
          <tbody>${lapRows}</tbody>
        </table>
      </div>
    </div>

    <div class="records-card profile-results-card">
      <div class="records-card-header">
        <div>
          <p class="pilot-tag">Race History</p>
          <h3>Недавние результаты</h3>
        </div>
        <div class="records-badge">${pilot.stats?.races || 0} гонок</div>
      </div>

      <div class="records-table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Трасса</th>
              <th>Финиш</th>
              <th>Круги</th>
              <th>Лучший круг</th>
            </tr>
          </thead>
          <tbody>${recentResultRows}</tbody>
        </table>
      </div>
      <div class="profile-results-pager">
        <button class="button profile-results-page-button" type="button" data-results-page="prev" ${state.profileResultsPage <= 1 ? "disabled" : ""}>
          Назад
        </button>
        <span>${state.profileResultsPage}/${totalResultPages}</span>
        <button class="button profile-results-page-button" type="button" data-results-page="next" ${state.profileResultsPage >= totalResultPages ? "disabled" : ""}>
          Вперед
        </button>
      </div>
    </div>

    <div class="records-card profile-results-card profile-cars-card">
      <div class="records-card-header">
        <div>
          <p class="pilot-tag">Cars</p>
          <h3>Машины пилота</h3>
        </div>
      </div>

      <div class="records-table-wrapper">
        <table class="records-table">
          <thead>
            <tr>
              <th>Машина</th>
              <th>Сессии</th>
              <th>Круги</th>
            </tr>
          </thead>
          <tbody>${carStatsRows}</tbody>
        </table>
      </div>
    </div>
  `;

  profileLayout.querySelectorAll("[data-track-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTrack = button.dataset.trackJump;
      renderTrackSelector();
      renderTrackLeaderboard();
      navigateToView("tracks");
      saveState();
    });
  });

  profileLayout.querySelectorAll("[data-race-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      openRaceResults(button.dataset.raceJump, "race");
    });
  });

  profileLayout.querySelectorAll("[data-results-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profileResultsPage += button.dataset.resultsPage === "next" ? 1 : -1;
      renderPilotProfile();
      saveState();
    });
  });
}

function renderTrackSelector() {
  const selector = document.querySelector("#track-selector");
  const query = state.trackSearchQuery.trim().toLowerCase();
  const bestRecords = buildTrackRecords().filter((record) =>
    record.track.toLowerCase().includes(query)
  );

  selector.innerHTML = bestRecords.length
    ? bestRecords
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
    .join("")
    : `
      <div class="track-search-empty">
        По запросу "${escapeHtml(state.trackSearchQuery)}" трасс не найдено.
      </div>
    `;

  selector.querySelectorAll("[data-track]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTrack = button.dataset.track;
      renderTrackSelector();
      renderTrackLeaderboard();
      pushNavigationState();
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
          <button
            class="track-map-open-button track-map-open-button-large"
            type="button"
            data-map-viewer-src="${escapeHtml(imagePath)}"
            data-map-viewer-title="${escapeHtml(state.selectedTrack)}"
          >
            <img
              class="track-map-image"
              src="${escapeHtml(imagePath)}"
              alt="Схема трассы ${escapeHtml(state.selectedTrack)}"
            />
            <span>Открыть на весь экран</span>
          </button>
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
      <p class="summary-text">из ${sortedPilots.length} пилотов имеют время на этой трассе.</p>
    </div>
  `;

  body.innerHTML = leaderboard.length
    ? leaderboard
    .map((entry, index) => {
      const place = String(index + 1);
      const gap = leaderTime === null ? "—" : formatGap(entry.timeMs - leaderTime);
      const sessionType = entry.source?.session_type;

      return `
        <tr>
          <td>${place}</td>
          <td>
            <button
              class="inline-nav-button"
              type="button"
              data-track-pilot-jump="${escapeHtml(entry.id)}"
            >
              ${escapeHtml(entry.name)}
            </button>
          </td>
          <td>${escapeHtml(entry.number)}</td>
          <td>${escapeHtml(entry.car || "—")}</td>
          <td>
            <button
              class="inline-nav-button track-time-source"
              type="button"
              data-session-source="${escapeHtml(JSON.stringify(entry.source || {}))}"
            >
              ${escapeHtml(entry.time)}
            </button>
          </td>
          <td>${escapeHtml(gap)}</td>
          <td>
            <button
              class="session-source-chip ${escapeHtml(getSessionChipClass(sessionType))}"
              type="button"
              data-session-source="${escapeHtml(JSON.stringify(entry.source || {}))}"
              data-tooltip="${escapeHtml(formatSessionHint(sessionType))}"
            >
              ${escapeHtml(formatSessionCode(sessionType))}
            </button>
          </td>
        </tr>
      `;
    })
    .join("")
    : `
      <tr>
        <td colspan="6" class="race-results-empty">На этой трассе пока нет пилотов с зафиксированным временем.</td>
      </tr>
    `;

  body.querySelectorAll("[data-track-pilot-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      openPilotProfile(button.dataset.trackPilotJump);
    });
  });

  body.querySelectorAll("[data-session-source]").forEach((button) => {
    button.addEventListener("click", () => {
      try {
        openSessionSource(JSON.parse(button.dataset.sessionSource || "{}"));
      } catch (error) {
        console.warn("Не удалось открыть сессию лучшего времени.", error);
      }
    });
  });
}

function renderRaces() {
  const list = document.querySelector("#races-list");
  const filteredRaces = getFilteredRaces();

  if (!Array.isArray(racesFeed.races) || racesFeed.races.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Гонки пока не загружены</h3>
        <p>Когда вы запустите скрипт выгрузки из API, этот раздел автоматически начнет показывать последние race-сессии.</p>
      </div>
    `;
    return;
  }

  if (!filteredRaces.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>Гонки не найдены</h3>
        <p>Попробуйте изменить название трассы или диапазон дат.</p>
      </div>
    `;
    return;
  }

  const raceIds = filteredRaces.map(getRaceId);
  if (state.selectedRaceId && !raceIds.includes(state.selectedRaceId)) {
    state.selectedRaceId = null;
  }

  list.innerHTML = filteredRaces
    .map((race) => {
      const raceId = getRaceId(race);
      const isOpen = state.selectedRaceId === raceId;
      const activeSession = getRaceSession(race);
      const hasPractice = Array.isArray(race.sessions?.practices) && race.sessions.practices.length > 0;
      const entries = getRaceSessionEntries(race);
      const leaderEntry = entries[0] || null;
      const bestLapMs = entries.reduce((best, entry) => {
        if (entry.best_lap_ms === null || entry.best_lap_ms === undefined) {
          return best;
        }

        if (best === null || entry.best_lap_ms < best) {
          return entry.best_lap_ms;
        }

        return best;
      }, null);
      const rows = entries.length
        ? entries
            .map(
              (entry) => `
                <tr>
                  <td>${escapeHtml(entry.position)}</td>
                  <td>
                    <button
                      class="inline-nav-button"
                      type="button"
                      data-pilot-jump="${escapeHtml(entry.pilot_id)}"
                    >
                      ${escapeHtml(entry.driver_name || "Неизвестный пилот")}
                    </button>
                  </td>
                  <td>${escapeHtml(entry.race_number || "—")}</td>
                  <td>${escapeHtml(entry.car_model_name || `Car #${entry.car_model ?? "—"}`)}</td>
                  <td>${escapeHtml(String(entry.lap_count ?? "—"))}</td>
                  <td class="${entry.best_lap_ms !== null && entry.best_lap_ms === bestLapMs ? "race-best-lap" : ""}">${escapeHtml(entry.best_lap || "—")}</td>
                  <td>${escapeHtml(formatRaceTotalTime(entry.total_time))}</td>
                  <td>${escapeHtml(formatRaceGapToLeader(entry, leaderEntry))}</td>
                </tr>
              `
            )
            .join("")
        : `
          <tr>
            <td colspan="8" class="race-results-empty">Результаты этой гонки пока не загружены.</td>
          </tr>
        `;

      const winnerLine =
        race.winner_name
          ? `${race.winner_name} ${race.winner_number || ""}`.trim()
          : "Нет данных по победителю";

      return `
        <article class="records-card race-card ${isOpen ? "is-open" : ""}" data-race-card-id="${escapeHtml(raceId)}">
          <button class="race-card-top race-toggle" type="button" data-race-id="${escapeHtml(raceId)}">
            <div>
              <p class="pilot-tag">Race Weekend</p>
              <h3>${escapeHtml(formatRaceTrackLabel(race))}</h3>
              <p class="race-card-winner">Победитель: ${escapeHtml(winnerLine)}</p>
            </div>
            <div class="race-card-badges">
              <div class="race-count-badge">${escapeHtml(String(race.entry_count || entries.length || 0))} пилотов</div>
              <div class="records-badge race-date-badge">${escapeHtml(formatRaceDate(race.date))}</div>
              <div class="race-chevron">${isOpen ? "−" : "+"}</div>
            </div>
          </button>
          <div class="race-results-panel ${isOpen ? "is-open" : ""}">
            <div class="race-session-switch">
              <button
                class="race-session-button ${activeSession.type === "race" ? "is-active" : ""}"
                type="button"
                data-race-session-id="${escapeHtml(raceId)}"
                data-race-session-type="race"
                ${race.sessions?.race ? "" : "disabled"}
              >
                Гонка
              </button>
              <button
                class="race-session-button ${activeSession.type === "qualifying" ? "is-active" : ""}"
                type="button"
                data-race-session-id="${escapeHtml(raceId)}"
                data-race-session-type="qualifying"
                ${race.sessions?.qualifying ? "" : "disabled"}
              >
                Квалификация
              </button>
              <button
                class="race-session-button ${activeSession.type === "practice" ? "is-active" : ""}"
                type="button"
                data-race-session-id="${escapeHtml(raceId)}"
                data-race-session-type="practice"
                ${hasPractice ? "" : "disabled"}
              >
                Практика
              </button>
            </div>
            <div class="records-table-wrapper">
              <table class="records-table race-results-table">
                <thead>
                  <tr>
                    <th>Позиция</th>
                    <th>Пилот</th>
                    <th>Номер</th>
                    <th>Машина</th>
                    <th>Круги</th>
                    <th>Лучший круг</th>
                    <th>Общее время</th>
                    <th>Отставание</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  list.querySelectorAll("[data-race-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const raceId = button.dataset.raceId;
      state.selectedRaceId = state.selectedRaceId === raceId ? null : raceId;
      renderRaces();
      saveState();
    });
  });

  list.querySelectorAll("[data-race-session-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.selectedRaceSessions[button.dataset.raceSessionId] = button.dataset.raceSessionType;
      renderRaces();
      saveState();
    });
  });

  list.querySelectorAll("[data-pilot-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      openPilotProfile(button.dataset.pilotJump);
    });
  });
}

async function loadRacesFeed() {
  if (window.__ACC_RACES_FEED__ && Array.isArray(window.__ACC_RACES_FEED__.races)) {
    racesFeed = window.__ACC_RACES_FEED__;
    renderRaces();
    return;
  }

  try {
    const response = await fetch("data/site-data.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    racesFeed = {
      updated_at: payload.updated_at,
      count: Array.isArray(payload.races) ? payload.races.length : 0,
      races: Array.isArray(payload.races) ? payload.races : []
    };
  } catch (error) {
    console.warn("Не удалось загрузить data/site-data.json", error);
    racesFeed = {
      updated_at: null,
      count: 0,
      races: []
    };
  }

  renderRaces();
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

function navigateToView(viewName) {
  setActiveView(viewName);
  pushNavigationState();
}

function restoreNavigationSnapshot(snapshot) {
  if (!snapshot) {
    return;
  }

  if (typeof snapshot.activeView === "string") {
    state.activeView = snapshot.activeView;
  }
  if (typeof snapshot.selectedTrack === "string" && tracks.includes(snapshot.selectedTrack)) {
    state.selectedTrack = snapshot.selectedTrack;
  }
  if (typeof snapshot.selectedPilotNumber === "string") {
    state.selectedPilotNumber = snapshot.selectedPilotNumber;
  }
  if (typeof snapshot.selectedRaceId === "string" || snapshot.selectedRaceId === null) {
    state.selectedRaceId = snapshot.selectedRaceId;
  }
  if (snapshot.selectedRaceSessions && typeof snapshot.selectedRaceSessions === "object") {
    state.selectedRaceSessions = snapshot.selectedRaceSessions;
  }
  if (typeof snapshot.profileResultsPage === "number") {
    state.profileResultsPage = snapshot.profileResultsPage;
  }

  renderPilotProfile();
  renderAnnouncements();
  renderTrackSelector();
  renderTrackLeaderboard();
  renderRaces();
  setActiveView(state.activeView);
}

function bindViewControls() {
  document.querySelectorAll("[data-view-target]").forEach((control) => {
    control.addEventListener("click", () => {
      navigateToView(control.dataset.viewTarget);
    });
  });
}

function bindProfileControls() {
  const backButton = document.querySelector("#back-to-list");

  backButton.addEventListener("click", () => {
    navigateToView("cards");
  });
}

function bindPilotToolbar() {
  const searchInput = document.querySelector("#pilot-search");
  const sortSelect = document.querySelector("#pilot-sort");
  const resetButton = document.querySelector("#pilot-filter-reset");

  searchInput.value = state.searchQuery;
  sortSelect.value = state.sortBy;

  document.querySelectorAll("[data-list-view]").forEach((control) => {
    control.classList.toggle("is-active", control.dataset.listView === state.listView);
  });

  searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    renderPilotList();
    saveState();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sortBy = event.target.value;
    renderPilotList();
    saveState();
  });

  resetButton?.addEventListener("click", () => {
    state.searchQuery = "";
    state.sortBy = DEFAULT_PILOT_SORT;
    state.listView = "compact";
    searchInput.value = "";
    sortSelect.value = state.sortBy;
    document.querySelectorAll("[data-list-view]").forEach((control) => {
      control.classList.toggle("is-active", control.dataset.listView === state.listView);
    });
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

function bindTrackSearch() {
  const trackSearch = document.querySelector("#track-search");

  if (!trackSearch) {
    return;
  }

  trackSearch.value = state.trackSearchQuery;
  trackSearch.addEventListener("input", (event) => {
    state.trackSearchQuery = event.target.value;
    renderTrackSelector();
    saveState();
  });
}

function bindRaceFilters() {
  const raceSearch = document.querySelector("#race-search");
  const raceDateFrom = document.querySelector("#race-date-from");
  const raceDateTo = document.querySelector("#race-date-to");
  const raceFilterReset = document.querySelector("#race-filter-reset");

  if (!raceSearch || !raceDateFrom || !raceDateTo || !raceFilterReset) {
    return;
  }

  raceSearch.value = state.raceSearchQuery;
  raceDateFrom.value = state.raceDateFrom;
  raceDateTo.value = state.raceDateTo;

  raceSearch.addEventListener("input", (event) => {
    state.raceSearchQuery = event.target.value;
    renderRaces();
    saveState();
  });

  raceDateFrom.addEventListener("change", (event) => {
    state.raceDateFrom = event.target.value;
    renderRaces();
    saveState();
  });

  raceDateTo.addEventListener("change", (event) => {
    state.raceDateTo = event.target.value;
    renderRaces();
    saveState();
  });

  raceFilterReset.addEventListener("click", () => {
    clearRaceFilters();
    renderRaces();
    saveState();
  });
}

function bindRaceScrollTop() {
  const button = document.querySelector("#race-scroll-top");
  const racesView = document.querySelector('[data-view="races"]');

  if (!button || !racesView) {
    return;
  }

  button.addEventListener("click", () => {
    racesView.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function openTrackMapModal(src, title) {
  const modal = document.querySelector("#track-map-modal");
  const image = document.querySelector("#track-map-modal-image");
  const heading = document.querySelector("#track-map-modal-title");

  if (!modal || !image || !heading || !src) {
    return;
  }

  image.src = src;
  image.alt = `Схема трассы ${title || ""}`.trim();
  heading.textContent = title ? `Схема трассы ${title}` : "Схема трассы";
  modal.hidden = false;
  document.body.classList.add("has-open-modal");
}

function closeTrackMapModal() {
  const modal = document.querySelector("#track-map-modal");
  const image = document.querySelector("#track-map-modal-image");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove("has-open-modal");

  if (image) {
    image.src = "";
    image.alt = "";
  }
}

function bindTrackMapModal() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-map-viewer-src]");

    if (openButton) {
      openTrackMapModal(openButton.dataset.mapViewerSrc, openButton.dataset.mapViewerTitle);
      return;
    }

    if (event.target.closest("[data-map-modal-close]")) {
      closeTrackMapModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeTrackMapModal();
    }
  });
}

loadState();
renderPilotList();
renderPilotProfile();
renderAnnouncements();
renderTrackSelector();
renderTrackLeaderboard();
renderRaces();
bindViewControls();
bindProfileControls();
bindPilotToolbar();
bindTrackSearch();
bindRaceFilters();
bindRaceScrollTop();
bindTrackMapModal();
setActiveView(state.activeView);
if (window.history?.replaceState) {
  history.replaceState(getNavigationSnapshot(), "", window.location.href);
}
window.addEventListener("popstate", (event) => {
  restoreNavigationSnapshot(event.state);
});
loadRacesFeed();
