// A region's location-options list: [{ location, service, wholeService }]. Services with flats
// are grouped, flats first and the whole service last, so flat level is the natural pick.

export const WHOLE_SERVICE_HINT =
    'Whole-service shift: for cover across the building, such as waking nights and leads. ' +
    'Only carers with this service listed can work it. For a shift in one flat, pick the flat.';

export function locationHelpers(options = []) {
    const byLocation = new Map(options.map((o) => [o.location, o]));
    return {
        locations: options.map((o) => o.location),
        groupOf: (location) => byLocation.get(location)?.service || 'Services',
        labelOf: (location) => (byLocation.get(location)?.wholeService ? `${location} (whole service)` : location),
        isWholeService: (location) => Boolean(byLocation.get(location)?.wholeService),
    };
}
