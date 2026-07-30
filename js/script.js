(function() {
    'use strict';

    let R = [], N = [], gM = null, gP = {}, gE = {}, dM = null;

    document.addEventListener('DOMContentLoaded', function() {
        loadData();
        initMobileMenu();
        initSmoothScroll();
        initKeyboard();
        window.addEventListener('resize', function() {
            if (gM) gM.invalidateSize();
            if (dM) dM.invalidateSize();
        });
    });

    function loadData() {
        fetch('data/rutas.json')
            .then(response => response.json())
            .then(data => {
                R = data.rutas;
                N = data.noticias;
                renderChips();
                renderCards();
                renderNews();
                initGeneralMap();
            })
            .catch(error => console.error('Error cargando los datos:', error));
    }

    function renderChips() {
        const container = document.getElementById('heroChips');
        if (!container) return;
        container.innerHTML = R.map(r => {
            const bc = r.color === '#2E7D32' ? 'dg' : 'g';
            return `<button class="chip" onclick="openR('${r.id}')">
                <span class="chip-b ${bc}">${r.shortId}</span>
                <div>
                    <span class="chip-n">${r.name}</span><br>
                    <span class="chip-c">${r.coverage}</span>
                </div>
            </button>`;
        }).join('');
    }

    function renderCards() {
        const grid = document.getElementById('rg');
        if (!grid) return;

        grid.innerHTML = R.map(r => {
            const bg = r.color === '#2E7D32' ? 'dgb' : 'gb';
            const bc = r.color === '#2E7D32' ? 'dg' : 'g';
            const s = r.stops;
            const summary = cleanStop(s[0]) + ' <span class="ar">→</span> ' + cleanStop(s[2]) + ' <span class="ar">→</span> ... <span class="ar">→</span> ' + cleanStop(s[s.length - 1]);
            
            return `<article class="rc" onclick="openR('${r.id}')" tabindex="0">
                <div class="rc-top ${bg}">
                    <span class="rc-id">${r.shortId}</span>
                    <div class="rc-dir">
                        <span class="rc-dir-n">${cleanStop(s[0])} → ${cleanStop(s[s.length - 1])}</span>
                        <span class="rc-dir-l">Recorrido ${r.shortId}</span>
                    </div>
                </div>
                <div class="rc-body">
                    <span class="rc-name">${r.name}</span>
                    <span class="rc-cov">${r.subtitle}</span>
                    <p class="rc-stops">${summary}</p>
                    <span class="rc-cnt">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                        ${s.length} paraderos
                    </span>
                    <span class="rc-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        Ver recorrido completo
                    </span>
                </div>
            </article>`;
        }).join('');

        grid.querySelectorAll('.rc').forEach(c => {
            c.addEventListener('keydown', e => { if (e.key === 'Enter') c.click(); });
        });

        document.getElementById('rc').textContent = R.length + ' rutas disponibles';
    }

    // Función mejorada para limpiar nombres largos de paradas
    function cleanStop(stop) {
        if (!stop) return '';
        return stop
            .replace(/Parada\s+/gi, '')
            .replace(/\s+Lado\s+(Oriental|Occidental|Norte|Sur)/gi, '')
            .replace(/\s+Esq\./gi, '')
            .replace(/\s+N[°º]\s+[\d-]+/gi, '')
            .trim();
    }

    window.openR = function(id) {
        const r = R.find(x => x.id === id);
        if (!r) return;

        const overlay = document.getElementById('rov');
        const content = document.getElementById('rc');
        if (!overlay || !content) return;

        const bc = r.color === '#2E7D32' ? 'dg' : 'g';
        const timeline = buildTimeline(r.stops);

        content.innerHTML = `
            <button class="rback" onclick="closeR()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Volver a rutas
            </button>
            <div class="dh">
                <span class="did ${bc}">${r.shortId}</span>
                <div>
                    <h2 class="dn">${r.name}</h2>
                    <div class="dm">
                        <span class="ds">En servicio</span>
                        <span>${r.coverage}</span>
                        <span>${r.stops.length} paraderos</span>
                    </div>
                </div>
            </div>
            <div class="dmc"><div id="dM" style="width:100%;height:420px"></div></div>
            <div class="dsc">
                <h3 class="dst">Paraderos en orden</h3>
                ${timeline}
            </div>
            <div class="dsc">
                <h3 class="dst">Observaciones</h3>
                <div class="dob">${r.observations}</div>
            </div>
            <button class="rback" onclick="closeR()" style="margin-top:24px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Volver
            </button>
        `;

        overlay.classList.add('on');
        overlay.scrollTop = 0;
        document.body.style.overflow = 'hidden';
        initDetailMap(r);
    };

    window.closeR = function() {
        const overlay = document.getElementById('rov');
        overlay.classList.remove('on');
        document.body.style.overflow = '';
        if (dM) { dM.remove(); dM = null; }
        setTimeout(() => { if (gM) gM.invalidateSize(); }, 200);
    };

    function buildTimeline(stops) {
        return stops.map((s, i) => {
            const isFirst = i === 0;
            const isLast = i === stops.length - 1;
            const dotClass = isFirst ? 's' : isLast ? 'e' : 'm';
            const nameClass = isFirst ? 'f' : isLast ? 'l' : '';
            const tag = isFirst ? '<span class="st gn">Inicio</span>' : isLast ? '<span class="st rd">Destino</span>' : '';
            const line = i < stops.length - 1 ? '<div class="sl"></div>' : '';

            return `<div class="si">
                <div class="sc">
                    <div class="sd ${dotClass}"></div>
                    ${line}
                </div>
                <span class="sn ${nameClass}">${s} ${tag}</span>
            </div>`;
        }).join('');
    }

    function initDetailMap(r) {
        if (dM) { dM.remove(); dM = null; }
        const el = document.getElementById('dM');
        if (!el) return;

        setTimeout(() => {
            dM = L.map(el, { zoomControl: true }).setView(r.waypoints[0], 13);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy;OSM &amp; CARTO', maxZoom: 19
            }).addTo(dM);

            L.polyline(r.waypoints, { color: r.color, weight: 6, opacity: 0.8 }).addTo(dM);

            L.marker(r.waypoints[0], { icon: L.divIcon({
                html: '<div style="width:24px;height:24px;border-radius:50%;background:#00843D;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2);border:2px solid #fff;font-family:Inter;font-size:10px;font-weight:700;color:#fff">A</div>',
                iconSize: [24, 24], iconAnchor: [12, 12]
            })}).addTo(dM).bindPopup(createPopup(r.stops[0], 'Inicio', '#00843D'));

            L.marker(r.waypoints[r.waypoints.length - 1], { icon: L.divIcon({
                html: '<div style="width:24px;height:24px;border-radius:50%;background:#D71920;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.2);border:2px solid #fff;font-family:Inter;font-size:10px;font-weight:700;color:#fff">B</div>',
                iconSize: [24, 24], iconAnchor: [12, 12]
            })}).addTo(dM).bindPopup(createPopup(r.stops[r.stops.length - 1], 'Destino', '#D71920'));

            r.keyStopIndices.forEach(idx => {
                if (idx > 0 && idx < r.stops.length - 1) {
                    const wpIdx = Math.round(idx / (r.stops.length - 1) * (r.waypoints.length - 1));
                    L.circleMarker(r.waypoints[wpIdx], {
                        radius: 6, color: r.color, fillColor: '#fff', fillOpacity: 1, weight: 2
                    }).addTo(dM).bindPopup(`<div style="font-family:Inter;font-size:12px">${r.stops[idx]}</div>`);
                }
            });

            dM.fitBounds(L.polyline(r.waypoints).getBounds().pad(0.12));
        }, 200);
    }

    function createPopup(name, title, color) {
        return `<div style="font-family:Inter;font-size:12px"><b>${name}</b><br><span style="color:${color};font-size:11px;font-weight:600">${title}</span></div>`;
    }

    function initGeneralMap() {
        const el = document.getElementById('genMap');
        if (!el) return;

        gM = L.map(el, { zoomControl: true }).setView([10.96, -74.78], 12);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy;OSM &amp; CARTO', maxZoom: 19
        }).addTo(gM);

        R.forEach(r => {
            gE[r.id] = true;
            const polyline = L.polyline(r.waypoints, { color: r.color, weight: 5, opacity: 0.7 }).addTo(gM);
            gP[r.id] = polyline;

            L.marker(r.waypoints[0], { icon: L.divIcon({
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${r.color};box-shadow:0 1px 3px rgba(0,0,0,.2);border:2px solid #fff"></div>`,
                iconSize: [14, 14], iconAnchor: [7, 7]
            })}).addTo(gM).bindPopup(`<div style="font-family:Inter;font-size:11px"><b>${r.shortId}</b> — ${cleanStop(r.stops[0])}</div>`);

            L.marker(r.waypoints[r.waypoints.length - 1], { icon: L.divIcon({
                html: '<div style="width:14px;height:14px;border-radius:50%;background:#D71920;box-shadow:0 1px 3px rgba(0,0,0,.2);border:2px solid #fff"></div>',
                iconSize: [14, 14], iconAnchor: [7, 7]
            })}).addTo(gM).bindPopup(`<div style="font-family:Inter;font-size:11px"><b>${r.shortId}</b> — ${cleanStop(r.stops[r.stops.length-1])}</div>`);
        });

        const bounds = R.map(r => L.polyline(r.waypoints).getBounds());
        gM.fitBounds(bounds.reduce((a, b) => a.extend(b)).pad(0.05));

        renderMapToggles();
    }

    function renderMapToggles() {
        const container = document.getElementById('mapTog');
        if (!container) return;

        container.innerHTML = `<p class="map-tog-t">Rutas</p>` + R.map(r => {
            const bc = r.color === '#2E7D32' ? 'dg' : 'g';
            return `<label class="mti" id="mt-${r.id}">
                <input type="checkbox" checked onchange="tog('${r.id}', this.checked)">
                <span class="mti-b ${bc}">${r.shortId}</span>
                <span class="mti-n">${r.name}</span>
            </label>`;
        }).join('');
    }

    window.tog = function(id, isOn) {
        gE[id] = isOn;
        if (gP[id]) {
            if (isOn) gP[id].addTo(gM);
            else gM.removeLayer(gP[id]);
        }
        const label = document.getElementById('mt-' + id);
        if (label) {
            if (isOn) label.classList.remove('off');
            else label.classList.add('off');
        }
    };

    function renderNews() {
        const grid = document.getElementById('nwG');
        if (!grid) return;

        grid.innerHTML = N.map(n => {
            const tagClass = n.tipo;
            const tagText = n.tipo.charAt(0).toUpperCase() + n.tipo.slice(1);
            return `<article class="nw">
                <span class="nw-tag ${tagClass}">${tagText}</span>
                <span class="nw-date">${formatDate(n.fecha)}</span>
                <h3 class="nw-title">${n.titulo}</h3>
                <p class="nw-body">${n.contenido}</p>
            </article>`;
        }).join('');
    }

    function formatDate(dateStr) {
        const parts = dateStr.split('-');
        const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
        return `${parts[2]} ${months[parseInt(parts[1])-1]} ${parts[0]}`;
    }

    function initMobileMenu() {
        const btn = document.getElementById('mobBtn');
        const nav = document.getElementById('mobNav');
        const openIcon = document.getElementById('mobO');
        const closeIcon = document.getElementById('mobC');
        if (!btn || !nav) return;

        btn.addEventListener('click', () => {
            const isOpen = nav.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen);
            openIcon.style.display = isOpen ? 'none' : 'block';
            closeIcon.style.display = isOpen ? 'block' : 'none';
        });

        nav.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                nav.classList.remove('open');
                btn.setAttribute('aria-expanded', 'false');
                openIcon.style.display = 'block';
                closeIcon.style.display = 'none';
            });
        });
    }

    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    function initKeyboard() {
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('rov');
                if (overlay && overlay.classList.contains('on')) closeR();
            }
        });
    }

})();