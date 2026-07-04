/* =========================================================================
   EEE WAYFINDER — BEHAVIOUR
   Everything here reads from data.js. No data is hard-coded in this file.
   ========================================================================= */

(function(){
  "use strict";

  // ---------------------------------------------------------- small utils

  const $ = (sel, el=document) => el.querySelector(sel);
  const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));

  const initials = (name) => name
    .replace(/^(Dr\.|Sri\.|Smt\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0,2)
    .map(w => w[0])
    .join("")
    .toUpperCase();

  const TYPE_META = {
    office:    { label:"Faculty Cabin", color:"#8e8bea", icon: iconOffice },
    lab:       { label:"Lab",           color:"#4b78da", icon: iconLab },
    classroom: { label:"Classroom",     color:"#c23af4", icon: iconClass },
    washroom:  { label:"Washroom",      color:"#d6b636", icon: iconWash },
    library:   { label:"Library",       color:"#39d88e", icon: iconLib },
    store:     { label:"Store Room",    color:"#ef673a", icon: iconStore },
    facility:  { label:"Facility",      color:"#20daf7", icon: iconFacility },
  };

  function iconOffice(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6"/></svg>`; }
  function iconLab(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L15 8V2"/><path d="M9 2h6"/></svg>`; }
  function iconClass(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 21h10M9 8h6M9 12h6"/></svg>`; }
  function iconWash(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="3"/><path d="M6 21v-5a6 6 0 0 1 12 0v5"/></svg>`; }
  function iconLib(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`; }
  function iconStore(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l2-4h14l2 4"/><path d="M3 7h18v13H3z"/><path d="M9 21v-6h6v6"/></svg>`; }
  function iconFacility(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`; }
  function iconArrow(){ return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`; }

  function floorLabel(key){
    return (FLOORS.find(f => f.key === key) || {}).label || key;
  }

  // Builds a plain-language direction sentence from the room's position
  // in the corridor sequence — this is generated, not hand-written per room,
  // so it never drifts out of sync with the data.
  function directionText(room){
    const order = FLOOR_ORDER[room.floor];
    const i = order.indexOf(room.code);
    const fl = floorLabel(room.floor);
    if(i === -1) return `Located on the ${fl}.`;
    if(i === 0) return `On the ${fl}, it's the first room as you enter the corridor.`;
    const prev = order[i-1];
    const prevRoom = ROOMS.find(r => r.code === prev);
    const prevName = prevRoom ? prevRoom.title : prev;
    return `On the ${fl}, continue past ${prev} (${prevName}) — ${room.code} is the very next door.`;
  }

  function avatarHTML(person){
    // Looks for assets/faculty/<photo>.png, falls back to initials if missing.
    if(!person) return "";
    const img = `${person.photo}.png`;
    return `<span class="avatar" data-fallback="${initials(person.name)}">
      <img src="${img}" alt="${person.name}" loading="lazy"
           onerror="var el=this.parentElement; if(el){ el.innerHTML=el.dataset.fallback; }">
    </span>`;
  }

  // -------------------------------------------------------- search index

  function buildSearchIndex(){
    const idx = [];
    ROOMS.forEach(room => {
      const occNames = room.occupants.map(o => o.name).join(" ");
      idx.push({
        kind:"room",
        room,
        haystack:[room.code, room.title, occNames, ...(room.tags||[]), floorLabel(room.floor)].join(" ").toLowerCase(),
      });
    });
    FACULTY.forEach(person => {
      idx.push({
        kind:"faculty",
        person,
        room: ROOMS.find(r => r.code === person.room),
        haystack:[person.name, person.designation, person.room, person.qualification].join(" ").toLowerCase(),
      });
    });
    return idx;
  }

  const SEARCH_INDEX = buildSearchIndex();

  function search(query){
    const q = query.trim().toLowerCase();
    if(!q) return [];
    const terms = q.split(/\s+/);
    return SEARCH_INDEX
      .filter(item => terms.every(t => item.haystack.includes(t)))
      .sort((a,b) => a.haystack.indexOf(terms[0]) - b.haystack.indexOf(terms[0]))
      .slice(0, 8);
  }

  // ------------------------------------------------------------- stats

  function renderStats(){
    const facultyEl = $("#statFaculty");
    const roomsEl = $("#statRooms");
    const floorsEl = $("#statFloors");
    if(facultyEl) facultyEl.textContent = FACULTY.length;
    if(roomsEl) roomsEl.textContent = ROOMS.length;
    if(floorsEl) floorsEl.textContent = FLOORS.length;
  }

  // ------------------------------------------------------------- render

  function renderFacultyGrid(){
    const grid = $("#facultyGrid");
    grid.innerHTML = FACULTY.map((p, i) => `
      <button class="faculty-card" data-faculty="${i}">
        ${avatarHTML(p)}
        <div class="fname">${p.name}</div>
        <div class="fdesig">${p.designation}</div>
        <div class="froom">${p.room}</div>
      </button>
    `).join("");

    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".faculty-card");
      if(!btn) return;
      const person = FACULTY[Number(btn.dataset.faculty)];
      const room = ROOMS.find(r => r.code === person.room);
      openDetail(room, person);
    });
  }

  let activeFloor = "ground";

  function renderFloorDeck(){
    const panel = $("#liftPanel");
    const nameEl = $("#floorName");
    const countEl = $("#floorCount");

    panel.innerHTML = FLOORS.map(f => `
      <button class="lift-button ${f.key===activeFloor?'active':''}" data-floor="${f.key}" aria-label="${f.label}">${f.short}</button>
    `).join("");

    const current = FLOORS.find(f => f.key === activeFloor);
    const roomCount = FLOOR_ORDER[activeFloor].length;
    nameEl.textContent = current.label;
    countEl.textContent = `${roomCount} rooms on this floor`;

    panel.addEventListener("click", (e) => {
      const btn = e.target.closest(".lift-button");
      if(!btn) return;
      activeFloor = btn.dataset.floor;
      renderFloorDeck();
      renderDirectoryBoard();
    }, { once:true }); // re-bound each render since panel.innerHTML is replaced
  }

  function renderDirectoryBoard(){
    const board = $("#directoryBoard");
    const order = FLOOR_ORDER[activeFloor];
    const rooms = order.map(code => ROOMS.find(r => r.code === code));
    board.innerHTML = rooms.map(room => {
      const meta = TYPE_META[room.type];
      const occCount = room.occupants.length;
      const subText = occCount
        ? room.occupants.map(o => o.name.replace(/^(Dr\.|Sri\.|Smt\.)\s*/i,"")).join(", ")
        : meta.label;
      return `
        <button class="board-row" data-room="${room.code}">
          <span class="row-icon" style="color:${meta.color}">${meta.icon()}</span>
          <span class="row-code">${room.code}</span>
          <span class="row-main">
            <span class="row-title">${room.title}</span>
            <span class="row-sub">${subText}</span>
          </span>
          ${occCount ? `<span class="row-count">${occCount} ${occCount===1?'faculty':'faculty'}</span>` : ""}
          <span class="row-arrow">${iconArrow()}</span>
        </button>`;
    }).join("");
  }

  function renderLegend(){
    const legend = $("#legend");
    legend.innerHTML = Object.entries(TYPE_META).map(([key,meta]) => `
      <span class="legend-item"><span class="legend-dot" style="background:${meta.color}"></span>${meta.label}</span>
    `).join("");
  }

  // ------------------------------------------------------------- detail

  function renderCorridor(room){
    const order = FLOOR_ORDER[room.floor];
    return order.map(code => {
      const r = ROOMS.find(x => x.code === code);
      const meta = TYPE_META[r.type];
      const isTarget = code === room.code;
      return `
        <div class="corridor-room ${isTarget?'target':''}">
          <span class="dot" style="${isTarget?'':`color:${meta.color}`}">${meta.icon()}</span>
          <span class="code">${code}</span>
        </div>`;
    }).join("");
  }

  function openDetail(room, highlightPerson){
    const meta = TYPE_META[room.type];
    const overlay = $("#overlay");

    const occupantsHTML = room.occupants.length ? `
      <div class="occupant-list">
        ${room.occupants.map(p => `
          <div class="occupant">
            ${avatarHTML(p)}
            <div>
              <div class="oname">${p.name}</div>
              <div class="odesig">${p.designation} · ${p.qualification}</div>
            </div>
          </div>`).join("")}
      </div>` : "";

    $("#detailCard").innerHTML = `
      <div class="detail-head">
        <button class="detail-close" id="detailClose" aria-label="Close">✕</button>
        <span class="detail-plate">${room.code}</span>
        <h3>${room.title}</h3>
        <div class="floor-label">${floorLabel(room.floor)} · ${meta.label}</div>
      </div>
      <div class="detail-body">
        <div class="direction-line">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>
          <span>${directionText(room)}</span>
        </div>
        ${occupantsHTML}
        <div class="strip-label">${floorLabel(room.floor)} corridor map</div>
        <div class="corridor">${renderCorridor(room)}</div>
      </div>
    `;

    overlay.classList.add("show");
    $("#detailClose").addEventListener("click", closeDetail);
    document.body.style.overflow = "hidden";
  }

  function closeDetail(){
    $("#overlay").classList.remove("show");
    document.body.style.overflow = "";
  }

  // -------------------------------------------------------------- search UI

  function initSearch(){
    const input = $("#searchInput");
    const list = $("#suggestions");
    const clearBtn = $("#searchClear");
    let activeIndex = -1;
    let results = [];

    function renderSuggestions(){
      if(!results.length){
        list.innerHTML = `<div class="empty">No match yet — try a room code like <strong>FF-11</strong>, a faculty name, or a lab like <strong>Power Systems</strong>.</div>`;
        list.classList.add("show");
        return;
      }
      list.innerHTML = results.map((item, i) => {
        if(item.kind === "faculty"){
          const p = item.person;
          return `
            <button class="sugg-item ${i===activeIndex?'active':''}" data-index="${i}">
              <span class="sugg-code">${p.room}</span>
              <span class="sugg-main">
                <div class="sugg-title">${p.name}</div>
                <div class="sugg-sub">${p.designation}</div>
              </span>
              <span class="sugg-kind">Faculty</span>
            </button>`;
        }
        const meta = TYPE_META[item.room.type];
        return `
          <button class="sugg-item ${i===activeIndex?'active':''}" data-index="${i}">
            <span class="sugg-code">${item.room.code}</span>
            <span class="sugg-main">
              <div class="sugg-title">${item.room.title}</div>
              <div class="sugg-sub">${floorLabel(item.room.floor)}</div>
            </span>
            <span class="sugg-kind">${meta.label}</span>
          </button>`;
      }).join("");
      list.classList.add("show");
    }

    function pick(item){
      if(item.kind === "faculty"){
        openDetail(item.room, item.person);
      } else {
        openDetail(item.room);
      }
      list.classList.remove("show");
      input.value = "";
      clearBtn.classList.remove("show");
    }

    input.addEventListener("input", () => {
      clearBtn.classList.toggle("show", !!input.value);
      activeIndex = -1;
      results = search(input.value);
      if(input.value.trim()) renderSuggestions();
      else list.classList.remove("show");
    });

    input.addEventListener("keydown", (e) => {
      if(!list.classList.contains("show")) return;
      if(e.key === "ArrowDown"){ e.preventDefault(); activeIndex = Math.min(activeIndex+1, results.length-1); renderSuggestions(); }
      else if(e.key === "ArrowUp"){ e.preventDefault(); activeIndex = Math.max(activeIndex-1, 0); renderSuggestions(); }
      else if(e.key === "Enter"){ e.preventDefault(); if(results[activeIndex]) pick(results[activeIndex]); }
      else if(e.key === "Escape"){ list.classList.remove("show"); }
    });

    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".sugg-item");
      if(!btn) return;
      pick(results[Number(btn.dataset.index)]);
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.classList.remove("show");
      list.classList.remove("show");
      input.focus();
    });

    document.addEventListener("click", (e) => {
      if(!e.target.closest(".search-shell")) list.classList.remove("show");
    });
  }

  function initBoardClicks(){
    $("#directoryBoard").addEventListener("click", (e) => {
      const btn = e.target.closest(".board-row");
      if(!btn) return;
      const room = ROOMS.find(r => r.code === btn.dataset.room);
      openDetail(room);
    });
  }

  function initOverlay(){
    $("#overlay").addEventListener("click", (e) => {
      if(e.target.id === "overlay") closeDetail();
    });
    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape") closeDetail();
    });
  }

  // ---------------------------------------------------------------- boot

  document.addEventListener("DOMContentLoaded", () => {
    renderStats();
    renderFacultyGrid();
    renderFloorDeck();
    renderDirectoryBoard();
    renderLegend();
    initSearch();
    initBoardClicks();
    initOverlay();
  });

})();
