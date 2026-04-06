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
  selectedPilotNumber: sortedPilots[0]?.number || null
};

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

  pilotList.innerHTML = sortedPilots
    .map(
      (pilot) => `
        <button class="pilot-list-item" type="button" data-pilot-number="${escapeHtml(pilot.number)}">
          <span class="pilot-list-name">${escapeHtml(pilot.name)}</span>
          <span class="pilot-list-number">${escapeHtml(pilot.number)}</span>
        </button>
      `
    )
    .join("");

  pilotList.querySelectorAll("[data-pilot-number]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPilotNumber = button.dataset.pilotNumber;
      renderPilotProfile();
      setActiveView("profile");
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
          <td>${escapeHtml(track)}</td>
          <td>${escapeHtml(pilot.lapTimes[track])}</td>
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
          <span class="track-button-name">${escapeHtml(record.track)}</span>
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

  title.textContent = state.selectedTrack;
  count.textContent = `${leaderboard.length} пилота`;

  summary.innerHTML = `
    <div class="summary-card">
      <p class="pilot-tag">Выбрана трасса</p>
      <h3>${escapeHtml(state.selectedTrack)}</h3>
      <p class="summary-text">
        ${
          bestEntry
            ? `Лучшее время сейчас у ${escapeHtml(bestEntry.name)} ${escapeHtml(bestEntry.number)}: ${escapeHtml(bestEntry.time)}.`
            : "Пока ни у одного пилота нет зафиксированного времени на этой трассе."
        }
      </p>
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

renderPilotList();
renderPilotProfile();
renderTrackSelector();
renderTrackLeaderboard();
bindViewControls();
bindProfileControls();
setActiveView(state.activeView);
