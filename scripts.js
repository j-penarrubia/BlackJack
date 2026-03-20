const $ = id => document.getElementById(id);

const CONTAINER = {
    jugador: 'cartas-jugador-container',
    dealer:  'cartas-dealer-container'
};

function inyectarEstilos() {
    if (document.getElementById('bj-animaciones')) return;
    const style = document.createElement('style');
    style.id = 'bj-animaciones';
    style.textContent = `
        .carta-wrapper {
            animation: cartaEntrada 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
            will-change: transform, opacity;
        }
        @keyframes cartaEntrada {
            from { transform: translateX(280px); opacity: 0; }
            to   { transform: translateX(0);     opacity: 1; }
        }
        .carta-wrapper.carta-saliendo {
            animation: cartaSalida 0.35s ease-in both;
            pointer-events: none;
        }
        @keyframes cartaSalida {
            to { transform: translateX(-280px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

async function barajar(barajas) {
    const res  = await fetch(`https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${barajas}`);
    const data = await res.json();
    return data.deck_id;
}

async function sacarCartas(mazoId, cantidad) {
    const res  = await fetch(`https://deckofcardsapi.com/api/deck/${mazoId}/draw/?count=${cantidad}`);
    const data = await res.json();
    return data.cards;
}

function calcularPuntos(cartas) {
    let puntos = 0;
    let ases   = 0;

    for (const { value } of cartas) {
        if (['JACK', 'QUEEN', 'KING'].includes(value)) {
            puntos += 10;
        } else if (value === 'ACE') {
            puntos += 11;
            ases++;
        } else {
            puntos += parseInt(value);
        }
    }

    while (puntos > 21 && ases > 0) { puntos -= 10; ases--; }

    return puntos;
}

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

function mostrarMensaje(html) {
    $('mensaje-superior').innerHTML = html;
}

function actualizarUI({ saldo, apuesta, puntuacionJugador, puntuacionBanca } = {}) {
    if (saldo              !== undefined) $('saldo-jugador').innerHTML     = saldo;
    if (apuesta            !== undefined) $('apuesta-jugador').innerHTML   = apuesta;
    if (puntuacionJugador  !== undefined) $('puntuacionJugador').innerHTML = puntuacionJugador;
    if (puntuacionBanca    !== undefined) $('puntuacionBanca').innerHTML   = puntuacionBanca;
}

function crearCartaDOM(cartaData, bocaArriba = true) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('carta-wrapper');

    const carta   = document.createElement('div');
    carta.classList.add('carta');

    const detras  = document.createElement('div');
    detras.classList.add('cara', 'carta-atras');

    const delante = document.createElement('div');
    delante.classList.add('cara', 'carta-frontal');
    delante.style.backgroundImage = `url('${cartaData.image}')`;

    carta.append(detras, delante);
    wrapper.appendChild(carta);

    if (bocaArriba) setTimeout(() => carta.classList.add('girada'), 300);

    return wrapper;
}

async function mostrarCartas(cartas, sitio) {
    const container = $(sitio === 'jugador' ? CONTAINER.jugador : CONTAINER.dealer);

    if (sitio === 'dealerdestapar') {
        const cartaOculta = container.querySelectorAll('.carta-wrapper')[1]?.querySelector('.carta');
        if (cartaOculta) {
            await esperar(300);
            cartaOculta.classList.add('girada');
            await esperar(900);
        }
        return;
    }

    const esDealerInicial = sitio === 'dealerTurno1';

    for (let i = 0; i < cartas.length; i++) {
        const bocaArriba = esDealerInicial ? i === 0 : true;
        const wrapper    = crearCartaDOM(cartas[i], bocaArriba);
        container.appendChild(wrapper);
        await esperar(bocaArriba ? 1000 : 500);
    }
}

async function limpiarCartas() {
    const animar = (containerId) => new Promise(resolve => {
        const container = $(containerId);
        const wrappers  = [...container.querySelectorAll('.carta-wrapper')];
        if (!wrappers.length) { resolve(); return; }

        wrappers.forEach((w, i) => {
            w.style.animationDelay = `${i * 0.06}s`;
            w.classList.add('carta-saliendo');
        });

        setTimeout(() => { container.innerHTML = ''; resolve(); }, 350 + wrappers.length * 60);
    });

    await Promise.all([animar(CONTAINER.jugador), animar(CONTAINER.dealer)]);
}

async function esperarApuesta(saldo) {
    mostrarMensaje(`Introduce tu apuesta. Saldo disponible: <strong>${saldo}</strong>`);

    const btnMenos     = $('btn-menos');
    const btnMas       = $('btn-mas');
    const inputApuesta = $('input-apuesta');
    const btnConfirmar = $('btn-confirmar');

    [btnMenos, btnMas, inputApuesta, btnConfirmar].forEach(el => el.classList.add('brillar'));

    return new Promise(resolve => {
        const onMenos = () => {
            const v = parseInt(inputApuesta.value) || 0;
            if (v > 0) inputApuesta.value = v - 1;
        };

        const onMas = () => {
            const v = parseInt(inputApuesta.value) || 0;
            if (v < saldo) inputApuesta.value = v + 1;
        };

        const onConfirmar = () => {
            const apuesta = parseInt(inputApuesta.value) || 0;
            if (apuesta < 1 || apuesta > saldo) {
                alert('Introduce una apuesta válida (entre 1 y tu saldo disponible).');
                inputApuesta.value = 0;
                return;
            }
            [btnMenos, btnMas, inputApuesta, btnConfirmar].forEach(el => el.classList.remove('brillar'));
            btnMenos.removeEventListener('click', onMenos);
            btnMas.removeEventListener('click', onMas);
            btnConfirmar.removeEventListener('click', onConfirmar);
            inputApuesta.value = 0;
            resolve(apuesta);
        };

        btnMenos.addEventListener('click', onMenos);
        btnMas.addEventListener('click', onMas);
        btnConfirmar.addEventListener('click', onConfirmar);
    });
}

async function esperarBoton() {
    return new Promise(resolve => {
        const btnPlantarse = $('btn-plantarse');
        const btnPedir     = $('btn-pedir-carta');

        btnPlantarse.classList.add('brillar');
        btnPedir.classList.add('brillar');

        const onPlantarse = () => {
            btnPedir.removeEventListener('click', onPedir);
            resolve('s');
        };
        const onPedir = () => {
            btnPlantarse.removeEventListener('click', onPlantarse);
            resolve('p');
        };

        btnPlantarse.addEventListener('click', onPlantarse, { once: true });
        btnPedir.addEventListener('click', onPedir,         { once: true });
    });
}

async function esperarDecision() {
    return new Promise(resolve => {
        mostrarMensaje('¿Quieres jugar otra mano o retirarte?');
        const mensaje = $('mensaje-superior');

        const btnContinuar = document.createElement('button');
        btnContinuar.classList.add('btn_decision', 'brillar');
        btnContinuar.innerText = 'Continuar jugando';

        const btnRetirarse = document.createElement('button');
        btnRetirarse.classList.add('btn_decision', 'brillar');
        btnRetirarse.innerText = 'Retirarse';

        mensaje.append(btnContinuar, btnRetirarse);

        btnContinuar.addEventListener('click', () => resolve('c'), { once: true });
        btnRetirarse.addEventListener('click', () => resolve('p'), { once: true });
    });
}

async function turnoJugador(mazoId, cartasJugador, apuesta) {
    mostrarMensaje('Turno del jugador');

    while (true) {
        const accion = await esperarBoton();
        $('btn-pedir-carta').classList.remove('brillar');
        $('btn-plantarse').classList.remove('brillar');

        if (accion === 's') break;

        const [nuevaCarta] = await sacarCartas(mazoId, 1);
        cartasJugador.push(nuevaCarta);
        await mostrarCartas([nuevaCarta], 'jugador');

        const puntuacion = calcularPuntos(cartasJugador);
        actualizarUI({ puntuacionJugador: puntuacion });

        if (puntuacion > 21) {
            mostrarMensaje(`Te has pasado de 21 con ${puntuacion}. ¡Pierdes ${apuesta}!`);
            return { puntuacion, bust: true };
        }
    }

    return { puntuacion: calcularPuntos(cartasJugador), bust: false };
}

async function turnoDealer(mazoId, cartasDealer) {
    mostrarMensaje('Turno de la banca');
    await mostrarCartas(null, 'dealerdestapar');

    let puntuacion = calcularPuntos(cartasDealer);
    actualizarUI({ puntuacionBanca: puntuacion });

    while (puntuacion < 17) {
        const [nuevaCarta] = await sacarCartas(mazoId, 1);
        cartasDealer.push(nuevaCarta);
        await mostrarCartas([nuevaCarta], 'dealer');
        puntuacion = calcularPuntos(cartasDealer);
        actualizarUI({ puntuacionBanca: puntuacion });
    }

    return puntuacion;
}

function evaluarResultado(pJugador, pDealer, apuesta) {
    if (pDealer > 21) {
        mostrarMensaje(`La banca se pasó con ${pDealer}. ¡Ganas ${apuesta}!`);
        return apuesta;
    }
    if (pDealer > pJugador) {
        mostrarMensaje(`La banca gana: ${pDealer} vs ${pJugador}. ¡Pierdes ${apuesta}!`);
        return -apuesta;
    }
    if (pDealer === pJugador) {
        mostrarMensaje(`Empate a ${pJugador}. Recuperas tu apuesta.`);
        return 0;
    }
    mostrarMensaje(`¡Ganas! ${pJugador} vs ${pDealer} de la banca. +${apuesta}!`);
    return apuesta;
}

async function blackjack() {
    inyectarEstilos();
    const mazoId = await barajar(6);
    let saldo = 1000;

    while (saldo > 0) {
        actualizarUI({ saldo, apuesta: 0, puntuacionJugador: 0, puntuacionBanca: '?' });

        const apuesta = await esperarApuesta(saldo);
        actualizarUI({ apuesta, saldo: saldo - apuesta });
        mostrarMensaje('Repartiendo cartas...');

        const cartasJugador = await sacarCartas(mazoId, 2);
        const cartasDealer  = await sacarCartas(mazoId, 2);

        await mostrarCartas(cartasJugador, 'jugador');
        await mostrarCartas(cartasDealer,  'dealerTurno1');
        actualizarUI({ puntuacionJugador: calcularPuntos(cartasJugador) });

        const { puntuacion: pJugador, bust } = await turnoJugador(mazoId, cartasJugador, apuesta);

        let delta = bust ? -apuesta : 0;

        if (!bust) {
            const pDealer = await turnoDealer(mazoId, cartasDealer);
            delta = evaluarResultado(pJugador, pDealer, apuesta);
        }

        saldo += delta;
        actualizarUI({ saldo });

        await esperar(1500);
        await limpiarCartas();
        actualizarUI({ apuesta: 0, puntuacionJugador: 0, puntuacionBanca: '?' });

        if (saldo <= 0) break;

        const decision = await esperarDecision();
        if (decision === 'p') {
            mostrarMensaje(`Te retiras con un saldo de ${saldo}. ¡Hasta pronto!`);
            break;
        }
        mostrarMensaje(`Continuamos. Saldo actual: ${saldo}`);
    }

    if (saldo <= 0) {
        mostrarMensaje('Tu saldo es 0. Recarga la página para volver a jugar.');
    }
}

blackjack();