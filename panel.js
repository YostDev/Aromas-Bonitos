const pagina2 = $(".pagina-principal");
const pagina3 = $(".pagina-ticket");
const pagina1 = $(".pagina-estadistica");
pagina1.hide();
pagina2.show();
pagina3.hide();

$(".btn-inicio").click(function(){
    let accion = $(this).data("accion");

    if(accion == "estadistica"){
        pagina1.show();
        pagina2.hide();
        pagina3.hide();
    } else if(accion == "inventario"){
        pagina1.hide();
        pagina2.show();
        pagina3.hide();
    } else if(accion == "ticket"){
        pagina1.hide();
        pagina2.hide();
        pagina3.show();
    }
});


$(".panel").hide();
let control = true;
$(".añadir").click(function(){
    if (control){   
        $(".panel").show();
        $(this).html('<i class="fas fa-arrow-left"></i>');
        $(this).addClass('subir');
        $(".panel").addClass('subirPanel');
        control = !control;
    } else {
        $(".panel").hide();
        control = !control;
        $(".panel").removeClass('subirPanel');
        $(this).removeClass('subir');
        $(this).html('<i class="fas fa-plus"></i>');
    }
});

function obtenerClaseStock(cantidad) {
    return cantidad <= 5 ? 'bajo-stock' : '';
}

function comprimirImagen(archivo, anchoMaximo, altoMaximo, calidad) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.readAsDataURL(archivo);
        
        lector.onload = function(evento) {
            const img = new Image();
            img.src = evento.target.result;
            
            img.onload = function() {
                let ancho = img.width;
                let alto = img.height;
                
                if (ancho > alto) {
                    if (ancho > anchoMaximo) {
                        alto = Math.round((alto * anchoMaximo) / ancho);
                        ancho = anchoMaximo;
                    }
                } else {
                    if (alto > altoMaximo) {
                        ancho = Math.round((ancho * altoMaximo) / alto);
                        alto = altoMaximo;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = ancho;
                canvas.height = alto;
                const ctx = canvas.getContext('2d');

                let tipoSalida = archivo.type; 

                if (tipoSalida === 'image/jpeg') {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, ancho, alto);
                }

                ctx.drawImage(img, 0, 0, ancho, alto);
                
                canvas.toBlob(function(blob) {
                    if (blob) {
                        resolve(new File([blob], archivo.name, {
                            type: tipoSalida,
                            lastModified: Date.now()
                        }));
                    } else {
                        reject(new Error("No se pudo comprimir la imagen"));
                    }
                }, tipoSalida, calidad); 
            };
            
            img.onerror = (err) => reject(err);
        };
        
        lector.onerror = (err) => reject(err);
    });
}

$(document).ready(function() {

    const SUPABASE_URL = 'https://bxwxulztcencoiiqogxy.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_DcBleL9fOIrDT9cRn4QOfA_b5ALE3JD'; 
    const IMGBB_API_KEY = 'a6118f7c48e5f1dc450a262a80c68365';
    const NOMBRE_TABLA = 'Clientes'; 
    const TABLA_VENTAS = 'Historial_Ventas'; 
    const NegocioId = 1;
    
    let todosLosProductos = [];
    let carrito = []; 
    let timersStock = {}; 


    $(".pagina-ticket").hide();

    function cargarProductos() {
        const urlAPI = `${SUPABASE_URL}/rest/v1/${NOMBRE_TABLA}?select=id,Imagen,Nombre,Precio,Cantidad,delete_url&Negocio_id=eq.${NegocioId}`;

        $.ajax({
            url: urlAPI,
            type: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            success: function(productos) {

                todosLosProductos = organizarPorStockBajo(productos); 
                renderizarProductos(todosLosProductos);
            },
            error: function(err) {
                console.error("Error al cargar productos:", err);
                $('#lista-productos').html('<p style="color:red;">Error al conectar con Supabase.</p>');
            }
        });
    }

    function organizarPorStockBajo(productosArray) {
        let deBajoStock = productosArray.filter(p => p.Cantidad <= 5 && p.Cantidad > 0);
        let sinStock = productosArray.filter(p => p.Cantidad === 0);
        let stockNormal = productosArray.filter(p => p.Cantidad > 5);
        return [...sinStock, ...deBajoStock, ...stockNormal];
    }

    function renderizarProductos(productosArray) {        
        $('#lista-productos').empty();

        if (productosArray.length === 0) {
            $('#lista-productos').append('<p>No se encontraron productos.</p>');
            return;
        }

        productosArray.forEach(function(prod) {
            let claseStockBajo = obtenerClaseStock(prod.Cantidad);
            let claseVisual = prod.Cantidad === 0 ? 'sin-stock' : claseStockBajo;
            let estructura = `
                <div class="producto-item ${claseVisual}">
                    <div class="producto-info">
                        <img src="${prod.Imagen}" alt="${prod.Nombre}" loading="lazy">
                        <div>
                            <strong>${prod.Nombre}</strong>
                            <p style="margin:5px 0 0 0; color:#7f8c8d; font-size: 0.7rem;">$${prod.Precio}</p>
                        </div>                 
                    </div>                                        
                    <div class="stock-control">
                        <div class="control">
                            <button class="btn-sumar sumar" data-id="${prod.id}">-</button>
                            <p>${prod.Cantidad}</p>
                            <button class="btn-sumar restar" data-id="${prod.id}">+</button>
                        </div>
                       <div class="action">
                            <button class="btn-eliminar" data-id="${prod.id}" data-deleteurl="${prod.delete_url || ''}"><i class="fas fa-trash"></i></button>
                            <button class="btn-eliminar check" data-id="${prod.id}"><i class="fas fa-check"></i></button>
                       </div>
                    </div>
                </div>
            `;
            $('#lista-productos').append(estructura);
        });
    }

    $(document).on('click', '.check', function() {
        let idProducto = $(this).data('id');
        let producto = todosLosProductos.find(p => p.id === idProducto);
        
        if (!producto) return;
        if (producto.Cantidad <= 0) {
            alert("No hay suficiente stock disponible de este producto.");
            return;
        }


        producto.Cantidad -= 1;
        

        let itemEnCarrito = carrito.find(item => item.id === idProducto);
        if (itemEnCarrito) {
            itemEnCarrito.cantidadVendida += 1;
        } else {
            carrito.push({
                id: producto.id,
                Nombre: producto.Nombre,
                Precio: producto.Precio,
                cantidadVendida: 1
            });
        }

        renderizarProductos(todosLosProductos);
        actualizarVistaTicket();
        
        $(this).css('background-color', '#2ecc71').delay(200).queue(function(next){
            $(this).css('background-color', '#9ecd9b');
            next();
        });
    });


    function actualizarVistaTicket() {
        const ticketProductsCont = $('.ticket-products');
        ticketProductsCont.empty();

        const hoy = new Date();
        const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${String(hoy.getFullYear()).substring(2)}`;
        $('.pagina-ticket h5').text(`Fecha: ${fechaFormateada}`);

        if (carrito.length === 0) {
            ticketProductsCont.append('<p style="text-align:center; color:#999;">El ticket está vacío.</p>');
            $('.ticket-total h3 span').text('$0');
            return;
        }

        let totalBruto = 0;


        carrito.forEach(item => {
            let subtotalItem = item.Precio * item.cantidadVendida;
            totalBruto += subtotalItem;

            let fila = `
                <div class="producto-ticket">
                    <h4>- ${item.Nombre} (x${item.cantidadVendida})</h4>
                    <p>$${subtotalItem}</p>
                </div>
            `;
            ticketProductsCont.append(fila);
        });


        let descuentoPorcentaje = parseFloat($('#ticket-descuento').val()) || 0;
        let descuentoMonto = (totalBruto * descuentoPorcentaje) / 100;
        let totalNeto = totalBruto - descuentoMonto;

        $('.ticket-total h3 span').text(`$${Math.round(totalNeto)}`);
    }

    $('#ticket-descuento').on('input', function() {
        actualizarVistaTicket();
    });


    $('#btn-imprimir').on('click', function() {
        if (carrito.length === 0) {
            alert("No hay productos en el ticket para guardar.");
            return;
        }
        cargarEstadisticas()

        $('#btn-imprimir').prop('disabled', true).text('Guardando Venta...');

        let totalFinal = parseFloat($('.ticket-total h3 span').text().replace('$', ''));

        let ventaParaGuardar = {
            Negocio_id: NegocioId,
            Total_Venta: totalFinal,
            Metodo_Pago: $('#metodo-pago').val(), 
            Detalle_Productos: carrito 
        };

        $.ajax({
            url: `${SUPABASE_URL}/rest/v1/${TABLA_VENTAS}`,
            type: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            data: JSON.stringify(ventaParaGuardar),
            success: function() {

                let actualizacionesStock = carrito.map(item => {
                    let prodOriginal = todosLosProductos.find(p => p.id === item.id);
                    return $.ajax({
                        url: `${SUPABASE_URL}/rest/v1/${NOMBRE_TABLA}?id=eq.${item.id}`,
                        type: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        data: JSON.stringify({ Cantidad: prodOriginal.Cantidad })
                    });
                });

                Promise.all(actualizacionesStock)
                    .then(() => {
                        alert("Venta registrada y stock actualizado.");

                        $('#btn-imprimir').hide();

                        const elementoTicket = document.querySelector('.pagina-ticket');

                        html2canvas(elementoTicket, {
                            backgroundColor: '#f4f7f6',
                            useCORS: true,              
                            scale: 2                    
                        }).then(canvas => {

                            const imagenBase64 = canvas.toDataURL('image/png');

                            const hoy = new Date();
                            const dia = String(hoy.getDate()).padStart(2, '0');
                            const mes = String(hoy.getMonth() + 1).padStart(2, '0');
                            const anio = String(hoy.getFullYear()).substring(2);
                            const nombreArchivo = `ticket(${dia}-${mes}-${anio}).png`;

                            const enlaceDescarga = document.createElement('a');
                            enlaceDescarga.href = imagenBase64;
                            enlaceDescarga.download = nombreArchivo;
                            
                            document.body.appendChild(enlaceDescarga);
                            enlaceDescarga.click();
                            document.body.removeChild(enlaceDescarga);


                            $('#btn-imprimir').show();

                            carrito = [];
                            $('#ticket-descuento').val('');
                            actualizarVistaTicket();
                            cargarProductos();

                            $('#btn-imprimir').prop('disabled', false).text('Descargar Ticket');
                        });
                    })
                    .catch(err => {
                        console.error("Error al descontar stock:", err);
                        alert("Venta guardada pero hubo un error al actualizar los stocks.");
                        $('#btn-imprimir').prop('disabled', false).text('Descargar Ticket');
                        $('#btn-imprimir').show();
                    });
            },
            error: function(err) {
                console.error("Error al registrar venta:", err);
                alert("No se pudo guardar la venta en Supabase.");
                $('#btn-imprimir').prop('disabled', false).text('Descargar Ticket');
            }
        });
    });


    $('#buscador').on('input', function() {
        let textoBusqueda = $(this).val().toLowerCase();
        let productosFiltrados = todosLosProductos.filter(function(prod) {
            return prod.Nombre.toLowerCase().includes(textoBusqueda);
        });

        renderizarProductos(organizarPorStockBajo(productosFiltrados));
    });

    $('#form-producto').on('submit', async function(e) {
        e.preventDefault();
        
        $('#mensaje-estado').css('color', '#34495e').text('Optimizando y comprimiendo imagen...');
        $('#btn-guardar').prop('disabled', true);

        let archivoOriginal = $('#p-imagen')[0].files[0];
        
        try {
            let archivoComprimido = await comprimirImagen(archivoOriginal, 500, 500, 0.7);
            
            $('#mensaje-estado').text('Subiendo imagen...');

            let formData = new FormData();
            formData.append('image', archivoComprimido); 

            $.ajax({
                url: `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
                type: 'POST',
                data: formData,
                contentType: false,
                processData: false,
                success: function(resImgbb) {
                    let urlFoto = resImgbb.data.url;
                    let urlBorradoImgbb = resImgbb.data.delete_url; 

                    $('#mensaje-estado').text('Registrando producto...');

                    let nuevoProducto = {
                        Negocio_id: NegocioId,
                        Nombre: $('#p-nombre').val(),
                        Precio: parseFloat($('#p-precio').val()),
                        Cantidad: parseInt($('#p-cantidad').val()),
                        Imagen: urlFoto,
                        delete_url: urlBorradoImgbb 
                    };

                    $.ajax({
                        url: `${SUPABASE_URL}/rest/v1/${NOMBRE_TABLA}`,
                        type: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        data: JSON.stringify(nuevoProducto),
                        success: function(data) {
                            $('#mensaje-estado').css('color', 'green').text('¡Producto añadido exitosamente!');
                            $('#form-producto')[0].reset();

                            if ($('#nombre-archivo').length) {
                                $('#nombre-archivo').text("Ningún archivo seleccionado");
                            }
                            
                            $('#btn-guardar').prop('disabled', false);
                            
                            if(data && data.length > 0) {
                                todosLosProductos.push(data[0]);
                                todosLosProductos = organizarPorStockBajo(todosLosProductos);
                                renderizarProductos(todosLosProductos);
                            }
                        },
                        error: function(err) {
                            console.error(err);
                            $('#mensaje-estado').css('color', 'red').text('Error al guardar.');
                            $('#btn-guardar').prop('disabled', false);
                        }
                    });
                },
                error: function(xhr) {
                    console.error("Detalles del error ImgBB:", xhr.responseText);
                    $('#mensaje-estado').css('color', 'red').text('Error al subir la imagen.');
                    $('#btn-guardar').prop('disabled', false);
                }
            });

        } catch (error) {
            console.error("Error en la compresión:", error);
            $('#mensaje-estado').css('color', 'red').text('No se pudo procesar la imagen.');
            $('#btn-guardar').prop('disabled', false);
        }
    });


    $(document).on('click', '.btn-eliminar:not(.check)', function() {
        let idProducto = $(this).data('id');

        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            $.ajax({
                url: `${SUPABASE_URL}/rest/v1/${NOMBRE_TABLA}?id=eq.${idProducto}`,
                type: 'DELETE',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                success: function() {
                    alert('Producto eliminado de la base de datos.');
                    todosLosProductos = todosLosProductos.filter(p => p.id !== idProducto);
                    renderizarProductos(todosLosProductos);
                },
                error: function(err) {
                    console.error(err);
                    alert('No se pudo eliminar el producto de Supabase.');
                }
            });
        }
    });


    $(document).on('click', '.btn-sumar', function() {
        let idProducto = $(this).data('id');
        let accion = $(this).hasClass('restar') ? 1 : -1;

        let producto = todosLosProductos.find(p => p.id === idProducto);
        if (!producto) return;

        let nuevaCantidad = producto.Cantidad + accion;
        if (nuevaCantidad < 0) nuevaCantidad = 0;

        producto.Cantidad = nuevaCantidad;
        
        renderizarProductos(todosLosProductos);

        if (timersStock[idProducto]) {
            clearTimeout(timersStock[idProducto]);
        }

        timersStock[idProducto] = setTimeout(function() {
            $.ajax({
                url: `${SUPABASE_URL}/rest/v1/${NOMBRE_TABLA}?id=eq.${idProducto}`,
                type: 'PATCH',
                headers: {
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({ Cantidad: nuevaCantidad }),
                success: function() {
                    console.log(`Guardado exitoso de stock: ${nuevaCantidad}`);
                },
                error: function(err) {
                    console.error(err);
                    alert('No se pudo actualizar la cantidad en la base de datos.');
                }
            });
        }, 1000); 
    });

    cargarProductos();
    function cargarEstadisticas() {
        const urlAPI = `${SUPABASE_URL}/rest/v1/${TABLA_VENTAS}?select=*&Negocio_id=eq.${NegocioId}`;

        $.ajax({
            url: urlAPI,
            type: 'GET',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            success: function(ventas) {
                
                const hoy = new Date();
                const fechaLocal = hoy.toLocaleDateString('en-CA');
              
                let ventasHoy = ventas.filter(v => {
                    let fechaVenta = new Date(v.created_at).toLocaleDateString('en-CA');
                    return fechaVenta === fechaLocal;
                });

                let totalCaja = 0;
                let totalEfectivo = 0;
                let totalMP = 0;
                let totalTarjeta = 0;
                let totalBanco = 0;

                ventasHoy.forEach(v => {
                    totalCaja += v.Total_Venta;
                    
                    if (v.Metodo_Pago === "Efectivo") totalEfectivo += v.Total_Venta;
                    else if (v.Metodo_Pago === "Mercado Pago") totalMP += v.Total_Venta;
                    else if (v.Metodo_Pago === "Tarjeta") totalTarjeta += v.Total_Venta;
                    else if (v.Metodo_Pago === "Transferencia") totalBanco += v.Total_Venta;
                });

                const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${String(hoy.getFullYear()).substring(2)}`;
                $('#stats-fecha').text(fechaFormateada);
                $('#stats-total').text(`$ ${totalCaja.toLocaleString()}`);
                $('#stats-cantidad').text(`Tickets de hoy: ${ventasHoy.length}`);

                $('#stats-mp').html(`<i class="fa-solid fa-qrcode"></i> $ ${totalMP.toLocaleString()}`);
                $('#stats-efectivo').html(`<i class="fa-solid fa-money-bill-wave"></i> $ ${totalEfectivo.toLocaleString()}`);
                $('#stats-tarjeta').html(`<i class="fa-solid fa-credit-card"></i> $ ${totalTarjeta.toLocaleString()}`);
                $('#stats-banco').html(`<i class="fa-solid fa-bank"></i> $ ${totalBanco.toLocaleString()}`);

                $('#stats-historial').empty();
                if(ventasHoy.length === 0) {
                     $('#stats-historial').append('<p style="color:#999; font-size:0.8rem;">No hay tickets registrados hoy.</p>');
                } else {
                    ventasHoy.forEach(v => {
                        $('#stats-historial').append(`
                            <div style="border-bottom: 1px solid #eee; padding: 10px 0; display:flex; justify-content: space-between; align-items: center; font-size: 0.9rem;">
                                <span><i class="fas fa-receipt" style="color:#ccc; margin-right:5px;"></i> ${v.Metodo_Pago}</span>
                                <strong style="color: #5b8048;">$${v.Total_Venta}</strong>
                            </div>
                        `);
                    });
                }

                let conteoProductos = {};
                ventasHoy.forEach(v => {
                    let detalles = typeof v.Detalle_Productos === 'string' ? JSON.parse(v.Detalle_Productos) : v.Detalle_Productos;
                    detalles.forEach(item => {
                        if(!conteoProductos[item.Nombre]) {
                            conteoProductos[item.Nombre] = 0;
                        }
                        conteoProductos[item.Nombre] += item.cantidadVendida;
                    });
                });

            
                let top3 = Object.keys(conteoProductos).map(nombre => {
                    return { nombre: nombre, cantidad: conteoProductos[nombre] };
                }).sort((a, b) => b.cantidad - a.cantidad).slice(0, 3);

                $('#stats-top-productos').empty();
                if(top3.length === 0) {
                    $('#stats-top-productos').append('<p>Sin ventas para calcular el Top 3.</p>');
                } else {
                    top3.forEach((prod, index) => {
                        $('#stats-top-productos').append(`
                            <div style="display:flex; justify-content: space-between; padding: 5px 0;">
                                <span><strong>#${index + 1}</strong> ${prod.nombre}</span>
                                <strong>x${prod.cantidad}</strong>
                            </div>
                        `);
                    });
                }
            },
            error: function(err) {
                console.error("Error al cargar estadísticas:", err);
            }
        });
    }

    cargarEstadisticas()
});