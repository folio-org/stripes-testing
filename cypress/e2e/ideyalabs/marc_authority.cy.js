import testTypes from '../../support/dictionary/testTypes';
import inventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import marcAuthoritiesDelete from '../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import topMenu from '../../support/fragments/topMenu';

describe.skip('Feature MARC Authority', () => {
  const testData = {
    source: 'MARC',
    searchOption: 'Keyword',
    authority650FieldValue: 'Speaking Oratory debating',
    searchHoldingOption: 'Keyword (title, contributor, identifier, HRID, UUID)',
    holdingValue: 'The !!!Kung of Nyae Nyae / Lorna Marshall.',
    record: 'Gibbons, Boyd',
    accordion: 'Subject',
    marcRecord: 'Beatles',
    tag: {
      tag650: '650',
    },
    derive: {
      searchOption: 'Personal name',
      authority700FieldValue: 'Gibbons, Boyd',
      tag700: '700',
      rowIndex: 1,
      accordion: 'Contributor',
      content: ' ',
    },
  };

  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  it(
    'C376987 User can print ""MARC authority"" record (spitfire)',
    { tags: [testTypes.ideaLabsTests] },
    () => {
      cy.visit(topMenu.marcAuthorities);
      marcAuthorities.searchBeats(testData.marcRecord);
      marcAuthorities.clickActionsButton();
      inventoryInstance.selectRecord();
      marcAuthoritiesDelete.clickprintButton();
      cy.exec('java -jar sikuli_ide.jar -r printer.sikuli');
    },
  );
});
