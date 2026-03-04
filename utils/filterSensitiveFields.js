/**
 * Filtra campos sensibles de precios/costos según el rol del usuario
 * Solo Administradores (role_id = 1) pueden ver información financiera
 */
function filterSensitiveFields(data, user, modelType) {
  const isAdmin = user?.role_id === 1;
  if (isAdmin) return data;
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => filterSingleItem(item, modelType));
  }
  return filterSingleItem(data, modelType);
}

function filterSingleItem(item, modelType) {
  if (!item) return item;
  const filtered = { ...item };

  switch (modelType) {
    case 'work_order':
      delete filtered.estimated_cost;
      // Si hay quotation anidado, filtrarlo también
      if (filtered.quotation) {
        filtered.quotation = filterSingleItem(filtered.quotation, 'quotation');
      }
      break;

    case 'quotation':
      delete filtered.profit_margin;
      delete filtered.subtotal;
      delete filtered.tax;
      delete filtered.total;
      // Filtrar items anidados
      if (filtered.quotation_items && Array.isArray(filtered.quotation_items)) {
        filtered.quotation_items = filtered.quotation_items.map(qi =>
          filterSingleItem(qi, 'quotation_item')
        );
      }
      break;

    case 'quotation_item':
      delete filtered.unit_price;
      delete filtered.subtotal;
      break;

    case 'material':
      delete filtered.unit_price;
      // Si hay material_requests anidados, filtrarlos
      if (filtered.material_requests && Array.isArray(filtered.material_requests)) {
        filtered.material_requests = filtered.material_requests.map(mr => {
          const filteredMr = { ...mr };
          if (filteredMr.material) {
            filteredMr.material = filterSingleItem(filteredMr.material, 'material');
          }
          return filteredMr;
        });
      }
      break;

    case 'tool':
      delete filtered.value;
      // Si hay tool_assignments anidados, filtrarlos
      if (filtered.tool_assignments && Array.isArray(filtered.tool_assignments)) {
        filtered.tool_assignments = filtered.tool_assignments.map(ta => {
          const filteredTa = { ...ta };
          if (filteredTa.tool) {
            filteredTa.tool = filterSingleItem(filteredTa.tool, 'tool');
          }
          return filteredTa;
        });
      }
      break;

    default:
      // No filtrar si no se especifica modelType
      break;
  }

  return filtered;
}

module.exports = { filterSensitiveFields };
