const { getPhotosByOrder, getPhotoById, createPhoto, updatePhoto, deletePhoto } = require('../models/orderPhotosModel');

const getByOrder = async (req, res) => {
  try {
    const { order_id } = req.params;
    const photos = await getPhotosByOrder(order_id);
    res.json(photos);
  } catch (error) {
    console.error('Error al obtener fotos:', error);
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const photo = await getPhotoById(id);
    if (!photo) return res.status(404).json({ error: 'Foto no encontrada' });
    res.json(photo);
  } catch (error) {
    console.error('Error al obtener foto:', error);
    res.status(500).json({ error: 'Error al obtener foto' });
  }
};

const create = async (req, res) => {
  try {
    const { order_id, url, name, size, category, comment } = req.body;
    if (!order_id || !url) {
      return res.status(400).json({ error: 'order_id y url son requeridos' });
    }
    const photoData = { order_id, url, name: name || null, size: size || null, category: category || null, comment: comment || null, user_id_registration: req.user.id };
    const newPhoto = await createPhoto(photoData);
    res.status(201).json({ mensaje: 'Foto creada exitosamente', data: newPhoto });
  } catch (error) {
    console.error('Error al crear foto:', error);
    res.status(500).json({ error: 'Error al crear foto' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, comment, status } = req.body;
    const existingPhoto = await getPhotoById(id);
    if (!existingPhoto) return res.status(404).json({ error: 'Foto no encontrada' });
    const photoData = { name, category, comment, status, user_id_modification: req.user.id };
    const updatedPhoto = await updatePhoto(id, photoData);
    res.json({ mensaje: 'Foto actualizada exitosamente', data: updatedPhoto });
  } catch (error) {
    console.error('Error al actualizar foto:', error);
    res.status(500).json({ error: 'Error al actualizar foto' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existingPhoto = await getPhotoById(id);
    if (!existingPhoto) return res.status(404).json({ error: 'Foto no encontrada' });
    const deletedPhoto = await deletePhoto(id, req.user.id);
    res.json({ mensaje: 'Foto eliminada exitosamente', data: deletedPhoto });
  } catch (error) {
    console.error('Error al eliminar foto:', error);
    res.status(500).json({ error: 'Error al eliminar foto' });
  }
};

module.exports = { getByOrder, getById, create, update, remove };
