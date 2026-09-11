// Authority heading DISPLAY handling for the "mapping.extended" authorities setting.
//
// When extended mapping is ON, the app renders "--" before the heading parts that come from
// subdivision subfields ($v/$x/$y/$z); when it is OFF (or the setting cannot be read) those
// separators are shown as plain spaces instead. Test data is authored in the "--" form, so it
// has to be collapsed to the space form whenever the setting is not ON.
//
// This is ONLY about how the app renders an assembled heading (search/browse result lists, the
// "Select MARC authority" linking plug-in). It must NOT be applied to raw subfield views
// (MARC source view, quickMARC) or to bibliographic record values, which use "--" independently
// of this setting.

export const collapseHeadingDelimiters = (heading) => heading.replace(/---/g, '- ').replace(/--/g, ' ');

// Yields the "mapping.extended" state as a boolean chainable. The underlying command caches the
// value in the Node process for the whole `cypress run`; here it is additionally mirrored into
// Cypress.env so repeat calls within a spec are a synchronous read with no task round-trip.
export const getExtendedMappingState = () => cy
  .then(() => {
    if (Cypress.env('authorityExtendedMappingState') === undefined) {
      return cy.getAuthorityExtendedMappingState();
    }
    return Cypress.env('authorityExtendedMappingState');
  })
  .then((state) => state === true);

// Yields the heading in the form the app will actually display it, based on the current setting.
export const expectedAuthorityHeading = (heading) => getExtendedMappingState().then((isExtended) => (isExtended ? heading : collapseHeadingDelimiters(heading)));
