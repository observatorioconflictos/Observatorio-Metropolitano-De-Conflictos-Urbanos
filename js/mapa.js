/* =========================================
   MAPA.JS - Motor General de Mapas
========================================= */

const urlCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSP-mkuUA5oFESiV0BPMnwQa_ycj2fy14YxcOGiYs0ADrztTby6oDV9cd-0WHKwvA/pub?gid=20337686&single=true&output=csv";
window.allMarkersData = window.allMarkersData || [];

// 1. Utilidades Globales
window.getRadiusByZoom = function(z) {
    if (z <= 10) return 8;
    if (z === 11) return 9;
    if (z === 12) return 15;
    if (z === 13) return 18;
    if (z === 14) return 25;
    if (z === 15) return 40;
    if (z === 16) return 60;
    if (z === 17) return 100;
    if (z === 18) return 200;
    return 150;
};

window.updateMarkerSizes = function(mapInstance) {
    if(!mapInstance) return;
    let currentZoom = mapInstance.getZoom();
    let newRadius = window.getRadiusByZoom(currentZoom);
    
    window.allMarkersData.forEach(item => {
        if(item.map === mapInstance) {
            item.marker.setRadius(newRadius);
        }
    });
};

window.getColorPorTematica = function(tematica) {
    if (!tematica) return "#fd2827"; 
    const t = tematica.toLowerCase().trim();
    if (t.includes("vialidad") || t.includes("movilidad")) return "#FF9800"; 
    if (t.includes("vivienda") || t.includes("suelo")) return "#E91E63"; 
    if (t.includes("patrimonio")) return "#9C27B0"; 
    if (t.includes("mercados") || t.includes("comerciales")) return "#FFEB3B"; 
    if (t.includes("espacio público")) return "#03A9F4"; 
    if (t.includes("ambiental")) return "#00E676"; 
    if (t.includes("demarcación")) return "#3F51B5"; 
    if (t.includes("servicios básicos")) return "#FFFFFF"; 
    return "#fd2827"; 
};

// --- NUEVA FUNCIÓN: Filtrar el mapa por temática ---
window.filtrarMapaPorTematica = function(temaStr, mapInstance) {
    // Si temaStr es nulo, mostramos todos. Si no, separamos las palabras clave.
    let keywords = temaStr ? temaStr.split(',') : [];
    
    window.allMarkersData.forEach(item => {
        if (item.map !== mapInstance) return; // Solo afectar el mapa actual
        
        let m = item.marker;
        let t = (item.tematica || "").toLowerCase();
        
        if (!temaStr) {
            // Mostrar todos
            if (!mapInstance.hasLayer(m)) m.addTo(mapInstance);
        } else {
            // Comprobar si la temática del punto incluye alguna de las palabras clave
            let match = keywords.some(k => t.includes(k.trim()));
            if (match) {
                if (!mapInstance.hasLayer(m)) m.addTo(mapInstance); // Mostrar
            } else {
                if (mapInstance.hasLayer(m)) m.remove(); // Ocultar
            }
        }
    });
};

// 2. Lógica del Menú Móvil
document.addEventListener('DOMContentLoaded', () => {
    const btnMenu = document.querySelector('.mobile-menu-btn');
    const menuNav = document.querySelector('.nav-menu');
    if (btnMenu && menuNav) {
        btnMenu.addEventListener('click', function() {
            menuNav.classList.toggle('show');
        });
    }
});

// 3. Inicialización dinámica del mapa
const containerIds = [
    { id: 'mapa-casos-grande', type: 'casos', link: 'mapa-completo-casos.html' },
    { id: 'mapa-tipos-grande', type: 'tipos', link: 'mapa-completo-tipos.html' },
    { id: 'mapa-completo-casos', type: 'casos', isFull: true },
    { id: 'mapa-completo-tipos', type: 'tipos', isFull: true }
];

let activeConfig = null;
let activeMapInstance = null;

for (let config of containerIds) {
    if (document.getElementById(config.id)) {
        activeConfig = config;
        break;
    }
}

if (activeConfig) {
    // Crear el mapa
    activeMapInstance = L.map(activeConfig.id, { 
        scrollWheelZoom: activeConfig.isFull === true, 
        zoomControl: false
    }).setView([-12.05, -77.04], 10);
    
    L.control.zoom({ zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(activeMapInstance);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }).addTo(activeMapInstance);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(activeMapInstance);

    activeMapInstance.on('zoomend', () => window.updateMarkerSizes(activeMapInstance));

    // Botón de pantalla completa
    if (!activeConfig.isFull && activeConfig.link) {
        const FullscreenControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function () {
                const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
                const link = L.DomUtil.create('a', '', container);
                link.innerHTML = '⛶'; 
                link.href = activeConfig.link;
                link.target = '_blank';
                link.title = "Abrir mapa completo";
                link.style.cssText = 'display: flex; justify-content: center; align-items: center; width: 30px; height: 30px; font-size: 18px; text-decoration: none; color: #000; background-color: #fff; cursor: pointer;';
                L.DomEvent.disableClickPropagation(container);
                return container;
            }
        });
        activeMapInstance.addControl(new FullscreenControl());
    }

    // LEYENDA INTERACTIVA (solo para los mapas de 'tipos')
    if (activeConfig.type === 'tipos') {
        let legendControl = L.control({ position: 'bottomleft' });
        legendControl.onAdd = function () {
            let div = L.DomUtil.create('div', 'map-legend-control');
            // Añadimos el atributo "data-tema" a cada item para identificarlo
            div.innerHTML = `
                <div class="legend-item" data-tema="vialidad,movilidad"><span style="background-color: #FF9800;"></span> Proyectos de vialidad / movilidad</div>
                <div class="legend-item" data-tema="vivienda,suelo"><span style="background-color: #E91E63;"></span> Acceso a la vivienda / suelo</div>
                <div class="legend-item" data-tema="patrimonio"><span style="background-color: #9C27B0;"></span> Patrimonio urbano</div>
                <div class="legend-item" data-tema="mercados,comerciales"><span style="background-color: #FFEB3B;"></span> Mercados y espacios comerciales</div>
                <div class="legend-item" data-tema="espacio público"><span style="background-color: #03A9F4;"></span> Espacio público (apropiación)</div>
                <div class="legend-item" data-tema="ambiental"><span style="background-color: #00E676;"></span> Ambiental</div>
                <div class="legend-item" data-tema="demarcación"><span style="background-color: #3F51B5;"></span> Demarcación</div>
                <div class="legend-item" data-tema="servicios básicos"><span style="background-color: #FFFFFF; border: 1px solid #aaa;"></span> Servicios Básicos</div>
            `;

            // Lógica de interactividad
            let items = div.querySelectorAll('.legend-item');
            items.forEach(item => {
                item.style.cursor = 'pointer';
                item.style.transition = 'opacity 0.3s'; // Para el efecto de "apagado"
                item.title = "Clic para filtrar por esta temática";
                
                item.addEventListener('click', function(e) {
                    L.DomEvent.stopPropagation(e); // Evita que el clic pase al mapa
                    
                    let tema = this.getAttribute('data-tema');
                    
                    if (this.classList.contains('active-filter')) {
                        // Si ya estaba activo y le damos clic, QUITAMOS EL FILTRO (mostramos todo)
                        items.forEach(i => {
                            i.classList.remove('active-filter');
                            i.style.opacity = '1';
                        });
                        window.filtrarMapaPorTematica(null, activeMapInstance);
                    } else {
                        // Si no estaba activo, APLICAMOS EL FILTRO
                        items.forEach(i => {
                            i.classList.remove('active-filter');
                            i.style.opacity = '0.3'; // Apagamos todos visualmente
                        });
                        this.classList.add('active-filter');
                        this.style.opacity = '1'; // Resaltamos solo el cliqueado
                        window.filtrarMapaPorTematica(tema, activeMapInstance);
                    }
                });
            });

            return div;
        };
        legendControl.addTo(activeMapInstance);
    }

    // 4. Leer CSV y Dibujar Puntos
    Papa.parse(urlCSV, {
        download: true, header: true, skipEmptyLines: true,
        complete: function(results) {
            let marcadores = [];

            // Variables para el Dashboard
            let totalConflictos = 0;
            let conflictosActivos = 0;
            let personasAfectadas = 0;

            results.data.forEach(fila => {
                let lat = parseFloat(fila['n_lat_I']);
                let lng = parseFloat(fila['n_lon_I']);
                let tematicaPri = fila['s_tematica_pri'] || ""; 
                
                // Cálculo de Cifras
                if (fila['t_caso'] && fila['t_caso'].trim() !== "") totalConflictos++;
                if (fila['s_estado'] && fila['s_estado'].trim().toLowerCase() === "activo") conflictosActivos++;
                if (fila['n_afectados'] && fila['n_afectados'].trim() !== "") {
                    let numAfectados = parseInt(fila['n_afectados'].replace(/,/g, ''), 10);
                    if (!isNaN(numAfectados)) personasAfectadas += numAfectados;
                }

                if (!isNaN(lat) && !isNaN(lng)) {
                    let colorMarcador = activeConfig.type === 'tipos' ? window.getColorPorTematica(tematicaPri) : "#fd2827";
                    
                    let marker = L.circleMarker([lat, lng], {
                        radius: window.getRadiusByZoom(activeMapInstance.getZoom()),
                        fillColor: colorMarcador,
                        color: "transparent",
                        weight: 0,
                        fillOpacity: 0.8,
                        className: "marker-blur-effect"
                    });
                    
                    if (fila['t_caso']) {
                        marker.bindTooltip(fila['t_caso'], { permanent: false, direction: 'top' });
                    }
                    
                    marker.on('click', () => {
                        if (window.abrirFichaDetalle) window.abrirFichaDetalle(fila);
                    });
                    
                    // --- AQUÍ EL CAMBIO CLAVE: Guardamos la 'tematica' dentro del array para poder filtrarla ---
                    window.allMarkersData.push({ 
                        marker: marker, 
                        map: activeMapInstance,
                        tematica: tematicaPri 
                    });
                    marcadores.push(marker);
                }
            });

            // Pintar los marcadores
            if (marcadores.length > 0) {
                L.layerGroup(marcadores).addTo(activeMapInstance);
            }

            // Actualizar HTML de las Cifras
            const elTotal = document.getElementById('cifra-total-conflictos');
            const elActivos = document.getElementById('cifra-activos');
            const elAfectados = document.getElementById('cifra-afectados');

            if (elTotal) elTotal.textContent = totalConflictos;
            if (elActivos) elActivos.textContent = conflictosActivos;
            if (elAfectados) elAfectados.textContent = personasAfectadas.toLocaleString();
        }
    });
}