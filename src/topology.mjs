import { domainHash } from "./canonical.mjs";

export function buildTopology(profile) {
  const regions = profile.regions.map((region, regionIndex) => ({
    ...region,
    fields: Array.from({ length: profile.fields_per_region }, (_, fieldIndex) => ({
      id: `${region.id}/field-${fieldIndex}`,
      cells: Array.from({ length: profile.cells_per_field }, (_, cellIndex) => ({
        id: `${region.id}/field-${fieldIndex}/cell-${cellIndex}`,
        device_range: {
          first: (((regionIndex * profile.fields_per_region + fieldIndex) * profile.cells_per_field + cellIndex) * profile.devices_per_cell),
          count: profile.devices_per_cell
        }
      }))
    }))
  }));
  const logicalIdentityCapacity = profile.regions.length
    * profile.fields_per_region
    * profile.cells_per_field
    * profile.devices_per_cell;
  const payload = {
    hierarchy: ["Device", "Cell", "Field", "Region", "Planet"],
    regions,
    logical_identity_capacity: logicalIdentityCapacity
  };
  return { ...payload, topology_root: domainHash("lifepp:scale-lab:topology:v1", payload) };
}

export function flattenCells(topology) {
  return topology.regions.flatMap((region) => region.fields.flatMap((field) => field.cells.map((cell) => ({
    ...cell,
    field_id: field.id,
    region_id: region.id,
    provider: region.provider,
    architecture: region.architecture
  }))));
}
