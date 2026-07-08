/* =========================================================================
   EEE WAYFINDER - BEHAVIOUR
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

  function directionText(room){
    const order = FLOOR_ORDER[room.floor];
    const i = order.indexOf(room.code);
    const fl = floorLabel(room.floor);
    if(i === -1) return `Located on the ${fl}.`;
    if(i === 0) return `On the ${fl}, it's the first room as you enter the corridor.`;
    const prev = order[i-1];
    const prevRoom = ROOMS.find(r => r.code === prev);
    const prevName = prevRoom ? prevRoom.title : prev;
    return `On the ${fl}, continue past ${prev} (${prevName}) - ${room.code} is the very next door.`;
  }

  function avatarHTML(person){
    if(!person) return "";
    const img = `${person.photo}.png`;
    return `<span class="avatar" data-fallback="${initials(person.name)}">
      <img src="${img}" alt="${person.name}" loading="lazy"
           onerror="var el=this.parentElement; if(el){ el.innerHTML=el.dataset.fallback; }">
    </span>`;
  }

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

  function renderStats(){
    const facultyEl = $("#statFaculty");
    const roomsEl = $("#statRooms");
    const floorsEl = $("#statFloors");
    if(facultyEl) facultyEl.textContent = FACULTY.length;
    if(roomsEl) roomsEl.textContent = ROOMS.length;
    if(floorsEl) floorsEl.textContent = FLOORS.length;
  }

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
    }, { once:true });
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

  let activeRouteGallery = null;

  const ROUTE_IMAGE_MAP = {
    "GF-01": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-01-step-2.jpg", label:"Way to GF-01" },
      { src:"dummy-gf-01-step-3.jpg", label:"Outside GF-01" },
    ],
    "GF-02": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-02-step-2.jpg", label:"Way to GF-02" },
      { src:"dummy-gf-02-step-3.jpg", label:"Outside GF-02" },
    ],
    "GF-03": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-03-step-2.jpg", label:"Way to GF-03" },
      { src:"dummy-gf-03-step-3.jpg", label:"Outside GF-03" },
    ],
    "GF-04": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-04-step-2.jpg", label:"Way to GF-04" },
      { src:"dummy-gf-04-step-3.jpg", label:"Outside GF-04" },
    ],
    "GF-05": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-05-step-2.jpg", label:"Way to GF-05" },
      { src:"dummy-gf-05-step-3.jpg", label:"Outside GF-05" },
    ],
    "GF-06": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-06-step-2.jpg", label:"Way to GF-06" },
      { src:"dummy-gf-06-step-3.jpg", label:"Outside GF-06" },
    ],
    "GF-07": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-07-step-2.jpg", label:"Way to GF-07" },
      { src:"dummy-gf-07-step-3.jpg", label:"Outside GF-07" },
    ],
    "GF-08": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-08-step-2.jpg", label:"Way to GF-08" },
      { src:"dummy-gf-08-step-3.jpg", label:"Outside GF-08" },
    ],
    "GF-09": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-09-step-2.jpg", label:"Way to GF-09" },
      { src:"dummy-gf-09-step-3.jpg", label:"Outside GF-09" },
    ],
    "GF-10": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-gf-10-step-2.jpg", label:"Way to GF-10" },
      { src:"dummy-gf-10-step-3.jpg", label:"Outside GF-10" },
    ],

    "FF-01": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-01-step-2.jpg", label:"Way to FF-01" },
      { src:"dummy-ff-01-step-3.jpg", label:"Outside FF-01" },
    ],
    "FF-02": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-02-step-2.jpg", label:"Way to FF-02" },
      { src:"dummy-ff-02-step-3.jpg", label:"Outside FF-02" },
    ],
    "FF-03": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-03-step-2.jpg", label:"Way to FF-03" },
      { src:"dummy-ff-03-step-3.jpg", label:"Outside FF-03" },
    ],
    "FF-04": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-04-step-2.jpg", label:"Way to FF-04" },
      { src:"dummy-ff-04-step-3.jpg", label:"Outside FF-04" },
    ],
    "FF-05": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-05-step-2.jpg", label:"Way to FF-05" },
      { src:"dummy-ff-05-step-3.jpg", label:"Outside FF-05" },
    ],
    "FF-06": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-06-step-2.jpg", label:"Way to FF-06" },
      { src:"dummy-ff-06-step-3.jpg", label:"Outside FF-06" },
    ],
    "FF-07": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-07-step-2.jpg", label:"Way to FF-07" },
      { src:"dummy-ff-07-step-3.jpg", label:"Outside FF-07" },
    ],
    "FF-08": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-08-step-2.jpg", label:"Way to FF-08" },
      { src:"dummy-ff-08-step-3.jpg", label:"Outside FF-08" },
    ],
    "FF-09": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-09-step-2.jpg", label:"Way to FF-09" },
      { src:"dummy-ff-09-step-3.jpg", label:"Outside FF-09" },
    ],
    "FF-10": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-10-step-2.jpg", label:"Way to FF-10" },
      { src:"dummy-ff-10-step-3.jpg", label:"Outside FF-10" },
    ],
    "FF-11": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-11-step-2.jpg", label:"Way to FF-11" },
      { src:"dummy-ff-11-step-3.jpg", label:"Outside FF-11" },
    ],
    "FF-12": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-12-step-2.jpg", label:"Way to FF-12" },
      { src:"dummy-ff-12-step-3.jpg", label:"Outside FF-12" },
    ],
    "FF-13": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-13-step-2.jpg", label:"Way to FF-13" },
      { src:"dummy-ff-13-step-3.jpg", label:"Outside FF-13" },
    ],
    "FF-14": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-14-step-2.jpg", label:"Way to FF-14" },
      { src:"dummy-ff-14-step-3.jpg", label:"Outside FF-14" },
    ],
    "FF-15": [
      { src:"entrance.jpg", label:"Take left side stairs to reach FF-15" },
      { src:"left-side-steps-to-ff.jpg", label:"Take immediate left to see FF-15" },
      { src:"edc-cs-lab.jpg", label:"Here you can see FF-15" },
    ],
    "FF-16": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-16-step-2.jpg", label:"Way to FF-16" },
      { src:"dummy-ff-16-step-3.jpg", label:"Outside FF-16" },
    ],
    "FF-17": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-17-step-2.jpg", label:"Way to FF-17" },
      { src:"dummy-ff-17-step-3.jpg", label:"Outside FF-17" },
    ],
    "FF-18": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-ff-18-step-2.jpg", label:"Way to FF-18" },
      { src:"dummy-ff-18-step-3.jpg", label:"Outside FF-18" },
    ],

    "SF-01": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-01-step-2.jpg", label:"Way to SF-01" },
      { src:"dummy-sf-01-step-3.jpg", label:"Outside SF-01" },
    ],
    "SF-02": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-02-step-2.jpg", label:"Way to SF-02" },
      { src:"dummy-sf-02-step-3.jpg", label:"Outside SF-02" },
    ],
    "SF-03": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-03-step-2.jpg", label:"Way to SF-03" },
      { src:"dummy-sf-03-step-3.jpg", label:"Outside SF-03" },
    ],
    "SF-04": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-04-step-2.jpg", label:"Way to SF-04" },
      { src:"dummy-sf-04-step-3.jpg", label:"Outside SF-04" },
    ],
    "SF-05": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-05-step-2.jpg", label:"Way to SF-05" },
      { src:"dummy-sf-05-step-3.jpg", label:"Outside SF-05" },
    ],
    "SF-06": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-06-step-2.jpg", label:"Way to SF-06" },
      { src:"dummy-sf-06-step-3.jpg", label:"Outside SF-06" },
    ],
    "SF-07": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-07-step-2.jpg", label:"Way to SF-07" },
      { src:"dummy-sf-07-step-3.jpg", label:"Outside SF-07" },
    ],
    "SF-08": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-08-step-2.jpg", label:"Way to SF-08" },
      { src:"dummy-sf-08-step-3.jpg", label:"Outside SF-08" },
    ],
    "SF-09": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-09-step-2.jpg", label:"Way to SF-09" },
      { src:"dummy-sf-09-step-3.jpg", label:"Outside SF-09" },
    ],
    "SF-10": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-10-step-2.jpg", label:"Way to SF-10" },
      { src:"dummy-sf-10-step-3.jpg", label:"Outside SF-10" },
    ],
    "SF-11": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-11-step-2.jpg", label:"Way to SF-11" },
      { src:"dummy-sf-11-step-3.jpg", label:"Outside SF-11" },
    ],
    "SF-12": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-12-step-2.jpg", label:"Way to SF-12" },
      { src:"dummy-sf-12-step-3.jpg", label:"Outside SF-12" },
    ],
    "SF-13": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-13-step-2.jpg", label:"Way to SF-13" },
      { src:"dummy-sf-13-step-3.jpg", label:"Outside SF-13" },
    ],
    "SF-14": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-14-step-2.jpg", label:"Way to SF-14" },
      { src:"dummy-sf-14-step-3.jpg", label:"Outside SF-14" },
    ],
    "SF-15": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-15-step-2.jpg", label:"Way to SF-15" },
      { src:"dummy-sf-15-step-3.jpg", label:"Outside SF-15" },
    ],
    "SF-16": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-16-step-2.jpg", label:"Way to SF-16" },
      { src:"dummy-sf-16-step-3.jpg", label:"Outside SF-16" },
    ],
    "SF-17": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-17-step-2.jpg", label:"Way to SF-17" },
      { src:"dummy-sf-17-step-3.jpg", label:"Outside SF-17" },
    ],
    "SF-18": [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-sf-18-step-2.jpg", label:"Way to SF-18" },
      { src:"dummy-sf-18-step-3.jpg", label:"Outside SF-18" },
    ],
  };

  function routeImages(room){
    return ROUTE_IMAGE_MAP[room.code] || [
      { src:"entrance.jpg", label:"Entrance" },
      { src:"dummy-route-step-2.jpg", label:`Way to ${room.code}` },
      { src:"dummy-route-step-3.jpg", label:`Outside ${room.code}` },
    ];
  }

  function renderRouteGallery(room){
    const photos = routeImages(room);
    return `
      <div class="route-gallery" data-route-gallery>
        <div class="route-gallery-head">
          <div>
            <div class="strip-label">Photo navigation</div>
            <div class="route-caption" data-route-caption>${photos[0].label}</div>
          </div>
          <div class="route-count"><span data-route-current>1</span> / ${photos.length}</div>
        </div>
        <div class="route-frame">
          ${photos.map((photo, i) => `
            <figure class="route-slide ${i===0?'active':''}" data-route-slide>
              <img src="${photo.src}" alt="${photo.label} for ${room.code}">
              <figcaption>${photo.label}</figcaption>
            </figure>
          `).join("")}
          <button class="route-nav route-prev" data-route-prev aria-label="Previous navigation photo">&#8249;</button>
          <button class="route-nav route-next" data-route-next aria-label="Next navigation photo">&#8250;</button>
        </div>
        <div class="route-dots">
          ${photos.map((photo, i) => `<button class="${i===0?'active':''}" data-route-dot="${i}" aria-label="Show ${photo.label}"></button>`).join("")}
        </div>
      </div>
    `;
  }

  function setupRouteGallery(room){
    const gallery = $("[data-route-gallery]");
    if(!gallery) return;

    const photos = routeImages(room);
    const slides = $$("[data-route-slide]", gallery);
    const dots = $$("[data-route-dot]", gallery);
    const caption = $("[data-route-caption]", gallery);
    const current = $("[data-route-current]", gallery);
    let active = 0;

    function show(index){
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("active", i === active));
      dots.forEach((dot, i) => dot.classList.toggle("active", i === active));
      caption.textContent = photos[active].label;
      current.textContent = active + 1;
    }

    $("[data-route-prev]", gallery).addEventListener("click", () => show(active - 1));
    $("[data-route-next]", gallery).addEventListener("click", () => show(active + 1));
    dots.forEach(dot => dot.addEventListener("click", () => show(Number(dot.dataset.routeDot))));

    activeRouteGallery = {
      previous: () => show(active - 1),
      next: () => show(active + 1),
    };
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
        <button class="detail-close" id="detailClose" aria-label="Close">x</button>
        <span class="detail-plate">${room.code}</span>
        <h3>${room.title}</h3>
        <div class="floor-label">${floorLabel(room.floor)} · ${meta.label}</div>
      </div>
      <div class="detail-body">
        <div class="direction-line">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8-8 18-2-8-8-2z"/></svg>
          <span>${directionText(room)}</span>
        </div>
        ${renderRouteGallery(room)}
        ${occupantsHTML}
        <div class="strip-label">${floorLabel(room.floor)} corridor map</div>
        <div class="corridor">${renderCorridor(room)}</div>
      </div>
    `;

    overlay.classList.add("show");
    $("#detailClose").addEventListener("click", closeDetail);
    setupRouteGallery(room);
    document.body.style.overflow = "hidden";
  }

  function closeDetail(){
    $("#overlay").classList.remove("show");
    activeRouteGallery = null;
    document.body.style.overflow = "";
  }

  function initSearch(){
    const input = $("#searchInput");
    const list = $("#suggestions");
    const clearBtn = $("#searchClear");
    let activeIndex = -1;
    let results = [];

    function renderSuggestions(){
      if(!results.length){
        list.innerHTML = `<div class="empty">No match yet - try a room code like <strong>FF-11</strong>, a faculty name, or a lab like <strong>Power Systems</strong>.</div>`;
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
      if(!$("#overlay").classList.contains("show") || !activeRouteGallery) return;
      if(e.key === "ArrowLeft"){ e.preventDefault(); activeRouteGallery.previous(); }
      if(e.key === "ArrowRight"){ e.preventDefault(); activeRouteGallery.next(); }
    });
  }

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
