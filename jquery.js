let cambiar = true;

$("#shop-icon").click(function(){
    $("#carrito-compras").animate({width: 'toggle'}); 
});

$("#close-cart").click(function(){
    $("#carrito-compras").hide();
});


$(document).ready(function() {
    $("#carrito-compras").hide();
    const SUPABASE_URL = 'https://bxwxulztcencoiiqogxy.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_DcBleL9fOIrDT9cRn4QOfA_b5ALE3JD'; 
    const NOMBRE_TABLA = 'Clientes'; 
function obtenerSlug() {
    const params = new URLSearchParams(window.location.search);
    return params.get('negocio') || 'aromasbonitos';
}

let NegocioId = null; 
const SLUG_ACTUAL = obtenerSlug();

    let carrito = [];

    function actualizarInterfazCarrito() {
        const $contenedor = $('.productos-carrito');
        $contenedor.empty(); 

        let total = 0;

        if (carrito.length === 0) {
            $contenedor.append('<p class="Aviso">Tu carrito está vacío.</p>');
        } else {
            carrito.forEach(function(item, index) {
                let subtotal = item.precio * item.cantidad;
                total += subtotal;

                let itemHTML = `
                    <div class="producto-item">
                        <span class="producto-nombre">
                            <strong>${item.nombre}</strong> (x${item.cantidad}) - $${subtotal.toLocaleString('es-AR')}
                        </span>
                        <button type="button" class="btn-eliminar" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                $contenedor.append(itemHTML);
            });
        }


        $('.resumen-carrito h3 span').text(`$${total.toLocaleString('es-AR')}`);
    }

    $('.contenedor-productos').on('click', '.accion', function() {
        const $tarjeta = $(this).closest('.producto');
        const nombre = $tarjeta.find('h3').text();
        const precioTexto = $tarjeta.find('.precio').text().split('-')[0].replace('$', '').trim();
        const precio = parseFloat(precioTexto);


        const productoExistente = carrito.find(item => item.nombre === nombre);

        if (productoExistente) {
            productoExistente.cantidad += 1;
        } else {
            carrito.push({
                nombre: nombre,
                precio: precio,
                cantidad: 1
            });
        }

        actualizarInterfazCarrito();
        
        
        if (cambiar) {
            $("#carrito-compras").show();
            cambiar = false;
        }
    });

    
    $('.productos-carrito').on('click', '.btn-eliminar', function() {
        const index = $(this).data('index');
        carrito.splice(index, 1); 
        actualizarInterfazCarrito();
    });

    
    $('.btn-vaciar').click(function() {
        carrito = [];
        actualizarInterfazCarrito();
    });

   
    $('.btn-pagar').click(function() {
        if (carrito.length === 0) {
            alert("Tu carrito está vacío.");
            return;
        }

        
        const TELEFONO_WHATSAPP = "-"; 
        
        let mensaje = "¡Hola! Me gustaría realizar el siguiente pedido:\n\n";
        let total = 0;

        carrito.forEach(function(item) {
            let subtotal = item.precio * item.cantidad;
            total += subtotal;
            mensaje += `• *${item.nombre}* (x${item.cantidad})\n`;
        });

        const mensajeCodificado = encodeURIComponent(mensaje);
        const urlWhatsapp = `https://wa.me/${TELEFONO_WHATSAPP}?text=${mensajeCodificado}`;

        window.open(urlWhatsapp, '_blank');
    });


    $('#buscador').on('keyup', function() {

        let terminoBusqueda = $(this).val().toLowerCase();
        

        $('.producto').filter(function() {

            let nombreProducto = $(this).find('h3').text().toLowerCase();

            $(this).toggle(nombreProducto.indexOf(terminoBusqueda) > -1);
        });
    });

    function cargarProductos() {
        const urlAPI = `${SUPABASE_URL}/rest/v1/${NOMBRE_TABLA}?select=Imagen,Nombre,Precio,Cantidad,Etiqueta&Negocio_id=eq.${NegocioId}`;

        $.ajax({
            url: urlAPI,
            type: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY, 
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            success: function(productos) {
                $('.contenedor-productos').empty();

                if (productos.length === 0) {
                    $('.contenedor-productos').append('<p class="Aviso">No hay productos disponibles para este negocio.</p>');
                    return;
                }

                productos.forEach(function(prod) {
                    let estructuraProducto = `
                        <div class="producto">
                            <img src="${prod.Imagen}" loading="lazy" alt="${prod.Nombre}">
                            <div class="info-producto">
                                <h3>${prod.Nombre}</h3>
                                <p class="precio">$${prod.Precio} - <span>${prod.Etiqueta}</span></p>
                                <button class="accion">Agregar al carrito</button>
                            </div>
                        </div>
                    `;
                    $('.contenedor-productos').append(estructuraProducto);
                });
            },
            error: function(error) {
                console.error("Error al traer los productos de Supabase:", error);
                $('.contenedor-productos').html('<p class="Aviso">Error al cargar los productos. Inténtelo más tarde.</p>');
            }
        });
    }
function inicializarNegocio() {
    $.ajax({
        url: `${SUPABASE_URL}/rest/v1/Negocios?slug=eq.${SLUG_ACTUAL}&select=*`,
        type: 'GET',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        success: function(data) {
            if (data.length > 0) {
                const negocio = data[0];
                NegocioId = negocio.id; 
                
                if(negocio.nombre) $('h1').text(negocio.nombre);
                if(negocio.logo_url) $('.logo').attr('src', negocio.logo_url);

                cargarProductos(); 
            } else {
                alert("Negocio no encontrado.");
            }
        }
    });
}

inicializarNegocio();
function inicializarNegocio() {
    $.ajax({
        url: `${SUPABASE_URL}/rest/v1/Negocios?slug=eq.${SLUG_ACTUAL}&select=*`,
        type: 'GET',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        success: function(data) {
            if (data.length > 0) {
                const negocio = data[0];
                NegocioId = negocio.id; 
                
                if(negocio.nombre) {
                    $('h1').text(negocio.nombre); 
                    document.title = negocio.nombre; 
                }
                if(negocio.logo_url) $('.logo').attr('src', negocio.logo_url);

                if(negocio.color_primario) {
                    document.documentElement.style.setProperty('--verde-landing', negocio.color_primario);
                }
                
                if(negocio.color_secundario) {
                    document.documentElement.style.setProperty('--color-secundario', negocio.color_secundario);
                }
                if(negocio.descripcion) $('#descripcion').text(negocio.descripcion);
                if(negocio.banner) $('#banner_image').attr('src', negocio.banner);

                if(negocio.whatsapp) $('#wasap').html(`<i class="fab fa-whatsapp"></i> ${negocio.whatsapp}`);
                if(negocio.direccion) $('#direccion').html(`<i class="fas fa-map-marker-alt"></i> ${negocio.direccion}`);
                if(negocio.horarios) $('#horarios').html(`<i class="fas fa-clock"></i> ${negocio.horarios}`);
                if(negocio.gmail) $('#gmail').html(`<i class="fas fa-envelope"></i> ${negocio.gmail}`);
                if(negocio.pagina_web) $('#pagina').attr('href', negocio.pagina_web).html(`<i class="fas fa-external-link-alt"></i> ${negocio.pagina_web}`);

                TELEFONO_WHATSAPP = negocio.whatsapp;

                cargarProductos(); 
            } else {
                alert("Negocio no encontrado.");
            }
        }
    });
}
inicializarNegocio()
});
