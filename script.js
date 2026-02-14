const URL_GOOGLE = "https://script.google.com/macros/s/AKfycbzJ5yqU1S9b4Ny45Oy2ffZSrY0XYCJJWWtxfkCNeG4OObIdcJrFyKGXwPtRMaegSRiR/exec";

window.onload = () => {
    cargarDatos();
    document.getElementById('btn-guardar').onclick = guardarCambios;
};

async function cargarDatos() {
    const body = document.getElementById('table-body');
    try {
        const res = await fetch(URL_GOOGLE);
        const datos = await res.json();
        renderizarTabla(datos);
        actualizarResumen(datos); // Actualiza las tarjetas superiores
        document.getElementById('last-update').textContent = "Sincronizado: " + new Date().toLocaleTimeString();
    } catch (e) {
        body.innerHTML = '<tr><td colspan="9" style="text-align:center; color:red;">Error de conexión.</td></tr>';
    }
}

// FUNCIÓN PARA EL RESUMEN SUPERIOR
function actualizarResumen(datos) {
    const contenedor = document.getElementById('resumen-totales');
    const totales = {};

    datos.forEach(fila => {
        const desc = fila.DESCRIPCION || "Otros";
        // Calculamos el stock real de esta fila
        const stockFila = (parseFloat(fila.TOTAL) || 0) - (
            (parseFloat(fila.ENTREGADO1) || 0) + (parseFloat(fila.ENTREGADO2) || 0) + 
            (parseFloat(fila.ENTREGADO3) || 0) + (parseFloat(fila.ENTREGADO4) || 0) + 
            (parseFloat(fila.ENTREGADO5) || 0)
        );
        // Agrupamos
        totales[desc] = (totales[desc] || 0) + stockFila;
    });

    contenedor.innerHTML = '';
    for (const [prod, suma] of Object.entries(totales)) {
        const card = document.createElement('div');
        card.className = 'summary-card';
        card.innerHTML = `<h3>${prod}</h3><p>${suma.toFixed(0)}</p>`;
        contenedor.appendChild(card);
    }
}

function renderizarTabla(datos) {
    const body = document.getElementById('table-body');
    body.innerHTML = '';

    datos.forEach(fila => {
        const tr = document.createElement('tr');
        const totalBase = parseFloat(fila.TOTAL) || 0;
        const sumaEntregas = (parseFloat(fila.ENTREGADO1)||0) + (parseFloat(fila.ENTREGADO2)||0) + 
                             (parseFloat(fila.ENTREGADO3)||0) + (parseFloat(fila.ENTREGADO4)||0) + 
                             (parseFloat(fila.ENTREGADO5)||0);

        tr.innerHTML = `
            <td class="col-descripcion">${fila.DESCRIPCION || 'S/N'}</td>
            <td>${fila.ORDEN || '-'}</td>
            <td>${fila.MTV || '-'}</td>
            <td class="col-total">${(totalBase - sumaEntregas).toFixed(0)}</td>
        `;

        for (let i = 1; i <= 5; i++) {
            const td = document.createElement('td');
            const input = document.createElement('input');
            input.type = "number";
            input.className = "input-entregado";
            
            // Si el valor es 0, lo dejamos vacío para limpieza visual
            const valor = fila[`ENTREGADO${i}`];
            input.value = (valor == 0 || valor == null) ? "" : valor;
            input.placeholder = "0";

            input.oninput = () => {
                let suma = 0;
                tr.querySelectorAll('.input-entregado').forEach(inp => suma += (parseFloat(inp.value) || 0));
                tr.querySelector('.col-total').textContent = (totalBase - suma).toFixed(0);
            };
            td.appendChild(input);
            tr.appendChild(td);
        }
        body.appendChild(tr);
    });
}

function filtrarTabla() {
    const filtro = document.getElementById("input-busqueda").value.toUpperCase();
    const filas = document.getElementById("table-body").getElementsByTagName("tr");
    for (let fila of filas) {
        const t1 = fila.cells[0].textContent.toUpperCase();
        const t2 = fila.cells[1].textContent.toUpperCase();
        fila.style.display = (t1.includes(filtro) || t2.includes(filtro)) ? "" : "none";
    }
}

async function guardarCambios() {
    const btn = document.getElementById('btn-guardar');
    btn.textContent = "⌛ GUARDANDO...";
    btn.disabled = true;

    const payload = [];
    document.querySelectorAll('#table-body tr').forEach(tr => {
        const inputs = tr.querySelectorAll('.input-entregado');
        const totalRestado = parseFloat(tr.querySelector('.col-total').textContent) || 0;
        const sumaIns = Array.from(inputs).reduce((a, b) => a + (parseFloat(b.value) || 0), 0);

        payload.push({
            DESCRIPCION: tr.cells[0].textContent,
            ORDEN: tr.cells[1].textContent,
            MTV: tr.cells[2].textContent,
            TOTAL: (totalRestado + sumaIns).toString(),
            ENTREGADO1: inputs[0].value || "0", 
            ENTREGADO2: inputs[1].value || "0",
            ENTREGADO3: inputs[2].value || "0", 
            ENTREGADO4: inputs[3].value || "0", 
            ENTREGADO5: inputs[4].value || "0"
        });
    });

    try {
        await fetch(URL_GOOGLE, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("✅ DATOS SINCRONIZADOS");
        cargarDatos();
    } catch (e) {
        alert("Error de red.");
    } finally {
        btn.textContent = "💾 GUARDAR CAMBIOS";
        btn.disabled = false;
    }
}