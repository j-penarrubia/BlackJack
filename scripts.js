//Las funciones deben ser asíncronas, pues nos estamos conectando a una API externa y por tanto, tenemos que poder pausarlas a la espera de los datos. 
async function barajar(barajas) {
    const respuesta = await fetch(`https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=${barajas}`);//Estas comillas se utilizan cuando en una URL queremos usar una variable
    const mazo = await respuesta.json();
    return mazo.deck_id;
}

async function sacarCartas(mazo, cant) {
    const respuesta = await fetch(`https://deckofcardsapi.com/api/deck/${mazo}/draw/?count=${cant}`);
    const cartas = await respuesta.json();
    return cartas.cards;
}

async function calcularPuntos(cartas) {
    let puntos = 0;
    let ases = 0;

    cartas.forEach(carta => {
        if (['JACK', 'QUEEN', 'KING'].includes(carta.value)) {
            puntos += 10;
        }
        else if (carta.value === 'ACE') {
            puntos += 11;
            ases += 1;
        } else {
            puntos += parseInt(carta.value);
        }
    });

    //Como los ases valen 1 y 11 podemos ajustar el valor cogiendo el 1 que es el que conviene cuando nos pasemos de 21
    while (puntos > 21 && ases > 0) {
        puntos -= 10;
        ases -= 1;
    }

    return puntos;
}

async function mostrarCartas(cartas, sitio) {

    let sitio_mesa;
    if (sitio == "jugador") {
        sitio_mesa = document.getElementById("cartas-jugador-container");
    } else {
        sitio_mesa = document.getElementById("cartas-dealer-container");
    }

    if (sitio == "dealerTurno1") {
        let mostrar = true;
        for (let cartaAislada of cartas) { //Usamos un for... of para iterar de manera asíncrona
            let carta = document.createElement('div');
            carta.classList.add('carta');

            let detras = document.createElement('div');
            detras.classList.add('cara');
            detras.classList.add('carta-atras');

            let delante = document.createElement('div');
            delante.classList.add('cara');
            delante.classList.add('carta-frontal');

            delante.style.backgroundImage = `url('${cartaAislada.image}')`;

            carta.appendChild(detras);
            carta.appendChild(delante);

            sitio_mesa.appendChild(carta);

            if (mostrar == true) {
                // Espera a que termine la animación antes de pasar a la siguiente carta
                await new Promise(resolve => {
                    setTimeout(() => {
                        carta.classList.toggle('girada');
                    }, 300); // Tiempo para el giro de la carta

                    setTimeout(resolve, 1000); // Espera adicional para que el giro se complete antes de continuar
                });
            } else {
                await new Promise(resolve =>
                    setTimeout(resolve, 500)
                );
            }
            mostrar = false;
        }
    } else if (sitio == "dealerdestapar") {
        let carta = sitio_mesa.children[1];
        await new Promise(resolve => {
            setTimeout(() => {
                carta.classList.toggle('girada');
            }, 300); // Tiempo para el giro de la carta

            setTimeout(resolve, 1000); // Espera adicional para que el giro se complete antes de continuar
        });

    } else {

        for (let cartaAislada of cartas) {
            let carta = document.createElement('div');
            carta.classList.add('carta');

            let detras = document.createElement('div');
            detras.classList.add('cara');
            detras.classList.add('carta-atras');

            let delante = document.createElement('div');
            delante.classList.add('cara');
            delante.classList.add('carta-frontal');

            delante.style.backgroundImage = `url('${cartaAislada.image}')`;

            carta.appendChild(detras);
            carta.appendChild(delante);

            sitio_mesa.appendChild(carta);

            // Espera a que termine la animación antes de pasar a la siguiente carta
            await new Promise(resolve => {
                setTimeout(() => {
                    carta.classList.toggle('girada');
                }, 300); // Tiempo para el giro de la carta

                setTimeout(resolve, 1000); // Espera adicional para que el giro se complete antes de continuar
            });
        }
    }

}

async function girarCartas() {
    let cartas = document.getElementsByClassName("carta");
    await new Promise(resolve => {
        setTimeout(() => {
            //El getElementsByClassName devuelve una colección que no es un array propio, por lo que para hacer uso del foreach debemos transformarlo en un array
            Array.from(cartas).forEach(carta => {
                carta.classList.toggle('girada');
            });
        }, 300); // Tiempo para el giro de la carta
        setTimeout(resolve, 1000); // Espera adicional para que el giro se complete antes de continuar
    });
}

//Esta función la ha reestructurado ChatGPT, los promises entraban en conflicto con los addeventlistener y además no se los podía quitar, la solución ha sido reemplazar en cada llamada a la función
//los botones por otros iguales para asegurarse de que no tienen un eventlistener colgado
async function esperarApuesta(saldo) {
    console.log(saldo);

    //Cogemos los elementos necesarios para ejecutar la función
    const mensajeSuperior = document.getElementById('mensaje-superior');
    const btnMenos = document.getElementById('btn-menos');
    const btnMas = document.getElementById('btn-mas');
    const inputApuesta = document.getElementById('input-apuesta');
    const btnConfirmar = document.getElementById('btn-confirmar');

    // Actualiza el mensaje inicial
    mensajeSuperior.innerHTML = `Introduce tu apuesta. Dispones de un saldo total de ${saldo}`;

    // Resalta los elementos relacionados
    btnMenos.classList.add('brillar');
    btnMas.classList.add('brillar');
    inputApuesta.classList.add('brillar');
    btnConfirmar.classList.add('brillar');

    // Asegurarse de limpiar cualquier listener previo reemplazando los botones por clones de sí mismos
    btnMenos.replaceWith(btnMenos.cloneNode(true));
    btnMas.replaceWith(btnMas.cloneNode(true));
    btnConfirmar.replaceWith(btnConfirmar.cloneNode(true));

    // Recuperar los nuevos botones después del reemplazo
    const btnMenosNuevo = document.getElementById('btn-menos');
    const btnMasNuevo = document.getElementById('btn-mas');
    const btnConfirmarNuevo = document.getElementById('btn-confirmar');

    // Crear la promesa que esperará la acción del usuario
    return new Promise((resolve) => {
        //Introducción de las funciones dentro de la promesa que devolveremos
        //Disminuir apuesta
        btnMenosNuevo.addEventListener('click', () => {
            const valorActual = parseInt(inputApuesta.value) || 0;
            if (valorActual > 0) {
                inputApuesta.value = valorActual - 1;
            }
        });

        // Aumentar apuesta
        btnMasNuevo.addEventListener('click', () => {
            const valorActual = parseInt(inputApuesta.value) || 0;
            if (valorActual < saldo) {
                inputApuesta.value = valorActual + 1;
            }
        });

        // Confirmar apuesta
        btnConfirmarNuevo.addEventListener('click', () => {
            const valorApuesta = parseInt(inputApuesta.value) || 0;
            if (valorApuesta > 0 && valorApuesta <= saldo) {
                // Limpiar estilos y resolver la promesa
                btnMenosNuevo.classList.remove('brillar');
                btnMasNuevo.classList.remove('brillar');
                inputApuesta.classList.remove('brillar');
                btnConfirmarNuevo.classList.remove('brillar');

                inputApuesta.value = 0;
                resolve(valorApuesta);
            } else {
                alert('Introduce una apuesta válida (entre 1 y tu saldo disponible).');
                inputApuesta.value = 0;
            }
        });
    });
}

async function esperarBoton() {
    return new Promise((resolve) => {
        const botonPlantarse = document.getElementById('btn-plantarse'); // Botón para plantarse
        botonPlantarse.classList.add('brillar');
        const botonPedir = document.getElementById('btn-pedir-carta'); // Botón para pedir carta
        botonPedir.classList.add('brillar');

        // Listeners para los botones
        botonPlantarse.addEventListener('click', () => {
            resolve('s'); // Resuelve la promesa con el botón presionado
        });

        botonPedir.addEventListener('click', () => {
            resolve('p'); // Resuelve la promesa con el botón presionado
        });
    });
}

async function esperarDecision() {
    return new Promise((resolve) => {
        let mensaje = document.getElementById("mensaje-superior");
        mensaje.innerHTML = "¿Quieres jugar otra mano o retirarte?";

        let btn_continuar = document.createElement('button');
        btn_continuar.classList.add('btn_decision');
        btn_continuar.classList.add('brillar');
        btn_continuar.innerText = "Continuar Jugando";

        let btn_plantarse = document.createElement('button');
        btn_plantarse.classList.add('btn_decision');
        btn_plantarse.classList.add('brillar');
        btn_plantarse.innerText = "Plantarse";

        mensaje.appendChild(btn_continuar);
        mensaje.appendChild(btn_plantarse);

        btn_continuar.addEventListener('click', () => {
            resolve('c');
        });
        btn_plantarse.addEventListener('click', () => {
            resolve('p');
        });
    });
}

async function blackjack() {

    const mazo_id = await barajar(6);//Cualquier llamada a una función asíncrona debe hacerse con un await, pues de lo contrario te devolverá el objeto resultante de la ejecucion de la misma (promesa).

    let saldo = 1000; //Las variables cuyo valor vaya a ser reasignado deberán asignarse con let
    let apuesta = 0;

    while (saldo > 0) {

        document.getElementById("saldo-jugador").innerHTML = saldo;

        do {
            apuesta = await esperarApuesta(saldo);
            console.log(`Apuesta confirmada: ${apuesta}`);

        } while (apuesta > saldo);
        document.getElementById("mensaje-superior").innerHTML = "Repartiendo cartas";

        document.getElementById('apuesta-jugador').innerHTML = apuesta;
        document.getElementById("saldo-jugador").innerHTML = saldo - apuesta;

        const cartasJugador = await sacarCartas(mazo_id, 2);
        const cartasDealer = await sacarCartas(mazo_id, 2);

        await mostrarCartas(cartasJugador, "jugador");
        await mostrarCartas(cartasDealer, "dealerTurno1");

        let puntuacionJugador = await calcularPuntos(cartasJugador);
        document.getElementById('puntuacionJugador').innerHTML = puntuacionJugador;

        // Turno del jugador
        document.getElementById('mensaje-superior').innerHTML = "Turno del jugador";
        let playerTurn = true;
        while (playerTurn) {
            const action = await esperarBoton();
            if (action === 'p') {
                const nuevaCarta = await sacarCartas(mazo_id, 1);
                await mostrarCartas(nuevaCarta, "jugador");
                cartasJugador.push(nuevaCarta[0]);

                puntuacionJugador = await calcularPuntos(cartasJugador);
                document.getElementById('puntuacionJugador').innerHTML = puntuacionJugador;

                if (puntuacionJugador > 21) {
                    saldo -= apuesta;
                    playerTurn = false;
                }
            } else if (action === 's') {
                playerTurn = false;
            }
            document.getElementById('btn-pedir-carta').classList.remove('brillar');
            document.getElementById('btn-plantarse').classList.remove('brillar');
        }

        if (puntuacionJugador <= 21) {
            document.getElementById('mensaje-superior').innerHTML = "Turno de la banca";
            await mostrarCartas("nope", "dealerdestapar");
            let puntuacionDealer = await calcularPuntos(cartasDealer);
            document.getElementById('puntuacionBanca').innerHTML = puntuacionDealer;

            while (puntuacionDealer < 17) {
                const cartaNueva = await sacarCartas(mazo_id, 1);
                await mostrarCartas(cartaNueva, "dealer");
                cartasDealer.push(cartaNueva[0]);
                puntuacionDealer = await calcularPuntos(cartasDealer);
                document.getElementById('puntuacionBanca').innerHTML = puntuacionDealer;
            }

            // Determinar ganador
            if (puntuacionDealer > 21) {
                document.getElementById('mensaje-superior').innerHTML = `La banca se pasó de 21. ¡Ganas ${apuesta}!`;
                saldo += apuesta;
            } else if (puntuacionDealer > puntuacionJugador) {
                document.getElementById('mensaje-superior').innerHTML = `La banca gana con una puntuación de ${puntuacionDealer}. ¡Pierdes ${apuesta}!`;
                saldo -= apuesta;
            } else if (puntuacionDealer == puntuacionJugador) {
                document.getElementById('mensaje-superior').innerHTML = `Empate ${puntuacionDealer}. ¡Recuperas ${apuesta}!`;
            }
            else {
                document.getElementById('mensaje-superior').innerHTML = `¡Ganas con una puntuación de ${puntuacionJugador} contra ${puntuacionDealer} de la banca. ¡Ganas ${apuesta}!`;
                saldo += apuesta;
            }
        }

        await girarCartas();

        document.getElementById("cartas-jugador-container").innerHTML = "";
        document.getElementById("cartas-dealer-container").innerHTML = "";
        document.getElementById('puntuacionBanca').innerHTML = "?";
        document.getElementById('puntuacionJugador').innerHTML = "0";
        document.getElementById("saldo-jugador").innerHTML = saldo;
        document.getElementById('apuesta-jugador').innerHTML = "0";


        let decision = true;
        let terminar = false;
        let continuar;
        while (decision == true) {
            continuar = await esperarDecision();

            if (continuar === 'c') {
                document.getElementById('mensaje-superior').innerHTML = `Continuas jugando, tu saldo es de ${saldo}`
                decision = false;
            } else if (continuar === 'p') {
                document.getElementById('mensaje-superior').innerHTML = `Te retiras y te vas a casita con un saldo de ${saldo}`
                decision = false;
                terminar = true;
                break;
            }
        }
        if (terminar == true) {
            break;
        }
    }
    if (saldo == 0) {
        document.getElementById('mensaje-superior').innerHTML = "Tu saldo es 0 y no puedes seguir jugando. Recarga la página para obtener 1000 de saldo";
    }

}

blackjack();