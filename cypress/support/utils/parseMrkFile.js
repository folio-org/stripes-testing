/**
 * Parses a .mrk file to object in order to create a MARC bibliographic/authority instance via API.
 * This function disregards the values of fields 006, 007, and 008.
 * Since field 008 is required, the default value will be used instead.
 *
 * @param {string} mark - The .mrk file content.
 * @returns {Object} The parsed content.
 */
export default function parseMrkFile(file) {
  const lines = file.split('\n');
  let leader = '';
  let fields = lines
    .map((line) => {
      const tag = line.slice(1, 4);
      // place an 'LDR' tag value into the separate object
      if (tag === 'LDR') {
        leader = line.slice(6).replace(/ /g, '\\').trim();
        // return null for 'LDR' lines
        return null;
      } else {
        // take a field content
        const content = tag === '001' ? line.slice(6) : line.slice(8);
        // if tag is '001', return only 'tag' and 'content'
        if (tag === '001') {
          return { tag, content };
        }
        // take a field indicator values
        const indicators = [line[6], line[7]];
        return { tag, indicators, content };
      }
    })
    // filter out null values (LDR)
    .filter(Boolean);

  // remove from the array all the fields from '001' up to the '008' tag, due to the inability to parse the values of the 006, 007, 008 fields
  const index001 = fields.findIndex((field) => field.tag === '001');
  const index008 = fields.findIndex((field) => field.tag === '008');
  if (index001 !== -1 && index008 !== -1) {
    fields = [...fields.slice(0, index001 + 1), ...fields.slice(index008 + 1)];
  }

  return { leader, fields };
}
