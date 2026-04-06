/* =========================================
   FICHA.JS - Lógica de la Ventana Modal
========================================= */

// Asegurarnos de que el array global de marcadores exista
window.allMarkersData = window.allMarkersData || [];
window.mapDetalle = null;

// Convertidor de links de Google Drive
window.convertirLinkDrive = function(url) {
    if (!url) return "";
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
};

// Función principal para abrir la ficha
window.abrirFichaDetalle = function(d) {
    document.body.classList.add('no-scroll');

    // Textos principales
    document.getElementById('ficha-titulo').innerText = d['t_caso'] || "Sin Título";
    document.getElementById('ficha-actualizacion').innerText = d['f_actualizacion'] || "-";
    
    // Estado
    let estado = d['s_estado'] || "Activo";
    let badge = document.getElementById('ficha-estado');
    badge.innerText = estado;
    badge.className = 'estado-badge ' + (estado.toUpperCase().trim() === 'ACTIVO' ? 'badge-activo' : 'badge-inactivo'); 

    // Función auxiliar para llenar listas
    const llenar = (id, arr) => {
        const el = document.getElementById(id);
        if(!el) return 0;
        el.innerHTML = "";
        let count = 0;
        arr.forEach(i => {
            if(i.v && i.v.trim() !== "") {
                el.innerHTML += `<li><strong>${i.l}:</strong> <span>${i.v}</span></li>`;
                count++;
            }
        });
        return count;
    };

    // Llenar datos de ubicación y detalles
    llenar('lista-ubicacion', [
        { l: "Provincia", v: d['sm_provincia'] },
        { l: "Distrito", v: d['sm_distrito'] },
        { l: "Barrio/AA.HH", v: d['t_barrio_aahh'] }
    ]);

    let c = llenar('lista-detalles', [
        { l: "Temática", v: d['s_tematica_pri'] },
        { l: "Fecha de inicio", v: d['f_inicio'] },
        { l: "Estimación de afectados", v: d['n_estimación_personas'] }
    ]);
    
    let wrapperDetalles = document.getElementById('wrapper-detalles');
    if(wrapperDetalles) wrapperDetalles.style.display = c > 0 ? 'block' : 'none';
    
    const fichaDesc = document.getElementById('ficha-descripcion');
    if(fichaDesc) {
        fichaDesc.innerText = d['t_descripcion'] || "Sin información adicional.";
        fichaDesc.style.textAlign = "justify";
    }
    
    // Manejo de la imagen
    let imgBlock = document.getElementById('wrapper-imagen');
    let imgElement = document.getElementById('ficha-imagen');
    let urlImg = window.convertirLinkDrive(d['u_imagen']); 

    if(imgBlock && imgElement) {
        if(urlImg && urlImg.length > 10) {
            imgBlock.style.display = 'block';
            imgElement.removeAttribute('src');
            imgElement.referrerPolicy = "no-referrer";
            imgElement.src = urlImg;
        } else {
            imgBlock.style.display = 'none';
            imgElement.src = "";
        }
    }

    // Mostrar el modal
    document.getElementById('modal-ficha').style.display = 'flex';

    // Cargar Minimapa
    setTimeout(() => {
        let lat = parseFloat(d['n_lat_I']);
        let lng = parseFloat(d['n_lon_I']);
        
        if(lat && lng) {
            if(!window.mapDetalle) {
                window.mapDetalle = L.map('mapa-detalle', { zoomControl: false }).setView([lat, lng], 15);
                L.control.zoom({ zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(window.mapDetalle);
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }).addTo(window.mapDetalle);
                L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}').addTo(window.mapDetalle);
                
                // Actualizar tamaño de punto al hacer zoom (usa la función de mapa.js)
                if(window.updateMarkerSizes) {
                    window.mapDetalle.on('zoomend', () => window.updateMarkerSizes(window.mapDetalle));
                }
            } else {
                window.mapDetalle.invalidateSize();
                window.mapDetalle.setView([lat, lng], 15);
            }
            
            // Limpiar puntos anteriores
            window.mapDetalle.eachLayer(l => { if(l instanceof L.CircleMarker) window.mapDetalle.removeLayer(l); });
            
            // Dibujar el nuevo punto (siempre rojo para el minimapa)
            let radio = window.getRadiusByZoom ? window.getRadiusByZoom(15) : 40;
            let markerDetalle = L.circleMarker([lat, lng], { 
                radius: radio, 
                color: 'transparent', 
                fillColor: '#fd2827', 
                fillOpacity: 0.8,
                className: "marker-blur-effect"
            }).addTo(window.mapDetalle);

            // Lo agregamos a la matriz global para que se redimensione con el zoom
            window.allMarkersData.push({ marker: markerDetalle, map: window.mapDetalle });
        }
    }, 200);
};

// Función para cerrar la ficha
window.cerrarFicha = function() {
    let modal = document.getElementById('modal-ficha');
    if(modal) modal.style.display = 'none';
    document.body.classList.remove('no-scroll');
};