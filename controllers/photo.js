const { Comment, Label, Photo, Message, Photorating, User, MsgBuyPhoto } = require("../models");
const uuid = require("uuid");
const Sequelize = require('sequelize');
const Jimp = require('jimp');
const Op = Sequelize.Op;
const fs = require("fs");

/* post /buscar */   /* --- agregarle el ratingPhoto bien hecho */

exports.buscarPhotos = async function (req, res) {
    const frase = req.body.buscar;
    const users = await User.findAll();
    const labels = await Label.findAll({ include: Photo });

    // Obtener fotos cuyo título coincide con la frase
    const photosByTitle = await Photo.findAll({
        where: {
            title: { [Op.like]: '%' + frase + '%' }
        },
        offset: 0,
        limit: 40,
        include: User
    });

    const labelsByKeyword = await Label.findAll({
        where: {
            keyword: { [Op.like]: '%' + frase + '%' }
        },
        offset: 0,
        limit: 40,
    });

    // Obtener fotos cuyo id coincide con el id de la foto de una etiqueta que coincide con la frase
    const photosByLabel = await Photo.findAll({
        where: {
            id: { [Op.in]: labelsByKeyword.map(label => label.idPhoto) }
        },
        offset: 0,
        limit: 40,
        include: User
    });

    function removeDuplicates(arr) {
        const unique = new Set();
        // Recorrer el array y almacenar cada objeto en forma de cadena de texto
        // en el conjunto (Set)
        arr.forEach(obj => unique.add(JSON.stringify(obj)));
        // Devolver el array de objetos únicos
        return Array.from(unique).map(obj => JSON.parse(obj));
    }

    // Combinar resultados y eliminar duplicados
    let photoss = [...photosByTitle, ...photosByLabel];
    const photosWithoutDuplicates = removeDuplicates(photoss);

    /* zona donde consigo photosRating */
    let array = new Set();
    let photoratings = await Photorating.findAll({ include: Photo });
    let photos = await Photo.findAll();

    photos.forEach((photo) => {
        let counter = 0; // contador de valoraciones dentro de la primer semana
        // Iterar por cada Photorating correspondiente a esta Photo
        photoratings.forEach((photorating) => {
            if (photorating.idPhoto === photo.id) {

                // Obtener la fecha de creación de la Photo correspondiente a este Photorating
                const photoCreationDate = new Date(photo.creationDate);
                const photoratingCreationDate = new Date(photorating.creationDate);
                const differenceInTime = photoratingCreationDate.getTime() - photoCreationDate.getTime();
                const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));
                // Si la diferencia de días es menor o igual a 7, sumar al contador de valoraciones dentro de la primer semana
                if (differenceInDays <= 7) {
                    counter++;
                }
            }
        });
        // Si la Photo tiene al menos 3 valoraciones dentro de la primer semana y tiene un numberOfStars mayor a 4, agregarla al array
        if (counter >= 3 && photo.numberOfStars > 4) {
            array.add(photo.id);
        }
    });

    // Obtener todas las Photos que tienen un id en el array
    let destacadas = await Photo.findAll({
        where: {
            id: Array.from(array), // Convertir el set a un array
        },
    });


    res.render("home", { photos: photosWithoutDuplicates, labels: labels, users: users, req: req, photosRating: destacadas });
};

/* get /delete/:id */
exports.deletePhoto = async function (req, res, next) {
    const id = req.params.id;

    const photos = await Photo.findAll({ where: { id: id } });

    if (photos.length > 0) {
        if (photos[0].image && fs.existsSync(`./public/images/${photos[0].image}`)) {
            fs.unlinkSync(`./public/images/${photos[0].image}`);
            console.log("El archivo se ha borrado correctamente");
        }

        if (photos[0].imageWatermark && fs.existsSync(`./public/imagesWatermark/${photos[0].imageWatermark}`)) {
            fs.unlinkSync(`./public/imagesWatermark/${photos[0].imageWatermark}`);
            console.log("El archivo se ha borrado correctamente");
        }

        if (photos[0].imageWatermarkFotaza && fs.existsSync(`./public/imagesWatermarkFotaza/${photos[0].imageWatermarkFotaza}`)) {
            fs.unlinkSync(`./public/imagesWatermarkFotaza/${photos[0].imageWatermarkFotaza}`);
            console.log("El archivo se ha borrado correctamente");
        }

        await Comment.destroy({ where: { idPhoto: id } });
        await Label.destroy({ where: { idPhoto: id } });
        await Photorating.destroy({ where: { idPhoto: id } });
        await MsgBuyPhoto.destroy({ where: { idPhoto: id } });
        await Message.destroy({ where: { description: photos[0].image } });
        await Photo.destroy({ where: { id: id } });
    }

    res.redirect("/user/profile");
}

/* get / */
exports.cargarDatos = async function (req, res, next) {

    const users = await User.findAll();
    const labels = await Label.findAll({ include: Photo });
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Utilizar la fecha para buscar registros en la base de datos
    const PhotosAccordingToYear = await Photo.findAll({
        where: {
            creationDate: {
                [Op.gt]: oneYearAgo
            }
        },
        include: User
    });

    // Agrupar las fotos por usuario
    const photosByUser = PhotosAccordingToYear.reduce((acc, photo) => {
        const userId = photo.User.id;
        if (!acc[userId]) {
            acc[userId] = [];
        }
        acc[userId].push(photo);
        return acc;
    }, {});

    // Seleccionar una foto aleatoria por cada usuario
    const randomPhotos = Object.values(photosByUser).map((photos) => {
        const randomIndex = Math.floor(Math.random() * photos.length);
        return photos[randomIndex];
    });


    /* zona donde consigo photosRating */
    let array = new Set();
    let photoratings = await Photorating.findAll({ include: Photo });
    let photos = await Photo.findAll();

    photos.forEach((photo) => {
        let counter = 0; // contador de valoraciones dentro de la primer semana
        // Iterar por cada Photorating correspondiente a esta Photo
        photoratings.forEach((photorating) => {
            if (photorating.idPhoto === photo.id) {

                // Obtener la fecha de creación de la Photo correspondiente a este Photorating
                const photoCreationDate = new Date(photo.creationDate);
                const photoratingCreationDate = new Date(photorating.creationDate);
                const differenceInTime = photoratingCreationDate.getTime() - photoCreationDate.getTime();
                const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));
                // Si la diferencia de días es menor o igual a 7, sumar al contador de valoraciones dentro de la primer semana
                if (differenceInDays <= 7) {
                    counter++;
                }
            }
        });
        // Si la Photo tiene al menos 3 valoraciones dentro de la primer semana y tiene un numberOfStars mayor a 4, agregarla al array
        if (counter >= 3 && photo.numberOfStars > 4) {
            array.add(photo.id);
        }
    });

    // Obtener todas las Photos que tienen un id en el array
    let destacadas = await Photo.findAll({
        where: {
            id: Array.from(array), // Convertir el set a un array
        },
    });


    res.render("home", { photos: randomPhotos.reverse(), labels: labels, users: users, req: req, photosRating: destacadas })
}

/* get /sort/:manera */
exports.sortPhoto = async function (req, res, next) {
    let photos = await Photo.findAll({ include: User });
    const users = await User.findAll();
    const labels = await Label.findAll({ include: Photo });

     /* zona donde consigo photosRating */
     let array = new Set();
     let photoratings = await Photorating.findAll({ include: Photo });
 
     photos.forEach((photo) => {
         let counter = 0; // contador de valoraciones dentro de la primer semana
         // Iterar por cada Photorating correspondiente a esta Photo
         photoratings.forEach((photorating) => {
             if (photorating.idPhoto === photo.id) {
 
                 // Obtener la fecha de creación de la Photo correspondiente a este Photorating
                 const photoCreationDate = new Date(photo.creationDate);
                 const photoratingCreationDate = new Date(photorating.creationDate);
                 const differenceInTime = photoratingCreationDate.getTime() - photoCreationDate.getTime();
                 const differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24));
                 // Si la diferencia de días es menor o igual a 7, sumar al contador de valoraciones dentro de la primer semana
                 if (differenceInDays <= 7) {
                     counter++;
                 }
             }
         });
         // Si la Photo tiene al menos 3 valoraciones dentro de la primer semana y tiene un numberOfStars mayor a 4, agregarla al array
         if (counter >= 3 && photo.numberOfStars > 4) {
             array.add(photo.id);
         }
     });
 
     // Obtener todas las Photos que tienen un id en el array
     let destacadas = await Photo.findAll({
         where: {
             id: Array.from(array), // Convertir el set a un array
         },
     });
 

    let manera = req.params.manera;

    switch (manera) {
        case 'fecha':
            photos.sort(function (a, b) {
                if (a.id > b.id) {
                    return 1;
                }
                if (a.id < b.id) {
                    return -1;
                }
                return 0;
            })
            break;
        case 'public':
            photos.splice(0, 0);
            photos = await Photo.findAll({ where: { privacy: 'Public' }, include: User });
            break;
        case 'protected':
            photos.splice(0, 0);
            photos = await Photo.findAll({ where: { privacy: 'Protected' }, include: User });
            break;
        case 'private':
            photos.splice(0, 0);
            photos = await Photo.findAll({ where: { privacy: 'Private' }, include: User });
            break;
    }

    res.render("home", { photos: photos, labels: labels, users: users, req: req, photosRating: destacadas })
}

/* get '/target-top/:id' */
exports.viewTarget = async function (req, res) {

    const id = req.params.id;
    const photos = await Photo.findAll({ where: { id: id } })

    res.render("target-view-top", { photos: photos, req: req })
};

/* get '/view/almacenar' */
exports.viewAlmacenarPhoto = function (req, res) {

    res.redirect("/almacenar");
};

/* post '/submitPhoto' */
exports.submitPhoto = async function (req, res) {

    const { imagen, watermark } = req.files;

    let { title, privacy, category, label1, label2, label3, rightOfUse } = req.body;
    let rutaImagenWatermark = '';
    let rutaImagenWatermarkFotaza = '';

    const users = await User.findAll({ where: { sessionId: req.sessionID } });

    /* PARA LAS IMAGENES SIN MARCA DE AGUA */
    const rutaImagen = uuid.v1() + imagen.name;
    imagen.mv('./public/images/' + rutaImagen);

    if (rightOfUse == "Copyright") {
        privacy = "private";

        const image1 = await Jimp.read(imagen.data);
        const image2 = await Jimp.read(watermark ? watermark.data : 'public/imagesImportant/copyright.png');
        const anchoImagen3 = image1.bitmap.width;
        const altoImagen3 = image1.bitmap.height;
        image2.resize(anchoImagen3, altoImagen3);
        image2.opacity(0.5)
        image1.blit(image2, 0, 0)

        rutaImagenWatermark = uuid.v1() + imagen.name;
        image1.write('./public/imagesWatermark/' + rutaImagenWatermark);
    }

    if (rightOfUse == "Copyleft") {
        const image = await Jimp.read(imagen.data);
        const imageWidth = image.bitmap.width;
        const imageHeight = image.bitmap.height;

        const copyleftImage = await Jimp.read('public/imagesImportant/copyleft.png');
        copyleftImage.resize(imageWidth / 10, Jimp.AUTO);

        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);
        const text = "Copyleft (c) " + new Date().getFullYear() + users[0].name;

        // Ajustar la posición de la imagen copyleft y el texto
        const copyleftX = imageWidth - copyleftImage.bitmap.width - 5;
        const copyleftY = 5;
        const textX = 5;
        const textY = imageHeight - Jimp.measureTextHeight(font, text) - copyleftImage.bitmap.height - 10;

        image.composite(copyleftImage, copyleftX, copyleftY);
        image.print(font, textX, textY, text, imageWidth, imageHeight);

        rutaImagenWatermark = uuid.v1() + imagen.name;
        await image.writeAsync('./public/imagesWatermark/' + rutaImagenWatermark);
    }


    if (privacy == "public" && rightOfUse != "Copyright") {
        const image3 = await Jimp.read(imagen.data);
        const image4 = await Jimp.read('public/imagesImportant/template.png');
        const anchoImagen3 = image3.bitmap.width;
        const altoImagen3 = image3.bitmap.height;
        image4.resize(anchoImagen3 * 2, altoImagen3 * 2);
        image3.blit(image4, -20, -20)
    }


    const tiempoTranscurrido = Date.now();
    const fechaCreacion = new Date(tiempoTranscurrido);
    fechaCreacion.toLocaleDateString();

    try {
        const result = await Photo.create({
            privacy: privacy,
            idOwner: users[0].id,
            image: rutaImagen,
            imageWatermark: rutaImagenWatermark,
            imageWatermarkFotaza: rutaImagenWatermarkFotaza,
            title: title,
            category: category,
            creationDate: fechaCreacion,
            format: imagen.mimetype,
            resolution: imagen.size,
            rightOfUse: rightOfUse,
        });

        const labels = [label1, label2, label3];
        for (const label of labels) {
            await Label.create({
                idPhoto: result.id,
                keyword: label,
            });
        }
    } catch (err) {
        res.redirect("/almacenar?error=hubo un error al cargar la imagen, verifique que los archivos sean correctos y que los campos esten completos");
    }

    res.redirect("/almacenar");
};

/* get /rating/:id/:numStar */
exports.ratingPhoto = async function (req, res) {
    const id = req.params.id;
    const numStar = req.params.numStar;

    const users = await User.findAll({ where: { sessionId: req.sessionID } });
    const photoratings = await Photorating.findAll({ where: { idPhoto: id, idUser: users[0].id } });
    const cantidadVotos = await Photorating.findAll({ where: { idPhoto: id } });
    let totalVotos = cantidadVotos.length + 1;

    let promedio = Math.floor(numStar);

    cantidadVotos.forEach(element => {
        promedio += Math.floor(element.starNumber);
    });

    const tiempoTranscurrido = Date.now();
    const fechaCreacion = new Date(tiempoTranscurrido);
    fechaCreacion.toLocaleDateString()

    if (photoratings.length == 0) {
        Photorating.create({
            idPhoto: id,
            creationDate: fechaCreacion,
            idUser: users[0].id,
            starNumber: numStar,
        });

        Photo.update({ numberOfStars: promedio / totalVotos }, { where: { id: id } })
    }


    res.redirect("/photo");

}


