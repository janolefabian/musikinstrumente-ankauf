export const cities = [
  ['berlin', 'Berlin'],
  ['bremen', 'Bremen'],
  ['dortmund', 'Dortmund'],
  ['dresden', 'Dresden'],
  ['duesseldorf', 'Düsseldorf'],
  ['duisburg', 'Duisburg'],
  ['essen', 'Essen'],
  ['frankfurt', 'Frankfurt am Main'],
  ['hamburg', 'Hamburg'],
  ['hannover', 'Hannover'],
  ['koeln', 'Köln'],
  ['leipzig', 'Leipzig'],
  ['muenchen', 'München'],
  ['nuernberg', 'Nürnberg'],
  ['stuttgart', 'Stuttgart']
].map(([slug, name]) => ({ slug, name }));

export const cityBySlug = Object.fromEntries(cities.map((city) => [city.slug, city]));
