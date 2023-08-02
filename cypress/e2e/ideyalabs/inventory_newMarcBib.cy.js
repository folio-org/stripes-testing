import marc from '../../support/ideyalabs/marc';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import holdingsRecordView from '../../support/fragments/inventory/holdingsRecordView';
import inventoryInstance from '../../support/fragments/inventory/inventoryInstance';
import inventorySearchAndFilter from '../../support/fragments/inventory/inventorySearchAndFilter';
import browseContributors from '../../support/fragments/inventory/search/browseContributors';
import marcAuthorities from '../../support/fragments/marcAuthority/marcAuthorities';
import marcAuthority from '../../support/fragments/marcAuthority/marcAuthority';
import quickMarcEditor from '../../support/fragments/quickMarcEditor';
import settingsMenu from '../../support/fragments/settingsMenu';
import topMenu from '../../support/fragments/topMenu';
import testTypes from '../../support/dictionary/testTypes';
import devTeams from '../../support/dictionary/devTeams';

const testData = {
  source: 'MARC',
  tag100Content: {
    secondBoxValue: "''",
    thirdBoxValue: "''",
    fourthBoxValue: '$a María de Jesús, $c de Agreda, sister, $d 1602-1665',
    fifthBoxValue: '',
    sixthBoxValue: '$0 id.loc.gov/authorities/childrensSubjects/sj2018050004',
    seventhBoxValue: '',
  },
  tag700Content: {
    secondBoxValue: "''",
    thirdBoxValue: "''",
    fourthBoxValue: '$a TestPersonalName',
    fifthBoxValue: '',
    sixthBoxValue: '$0 id.loc.gov/authorities/names/n00000911',
    seventhBoxValue: '',
  },
  search: {
    searchOption: 'Keyword',
    value: 'personal',
  },
  search240: {
    searchOption: 'Keyword',
    value: 'personal',
  },
  search730: {
    searchOption: 'Keyword',
    value: 'Iroquois people',
  },

  rowIndex: {
    row100: 5,
    row700: 6,
  },
  tags: {
    tag100: '100',
    tag700: '700',
    tag245: '245',
    tagLDR: 'LDR',
    tag240: '240',
    tag730: '730',
    tag650: '650',
    tag852: '852',
    tag866: '866',
  },
  fieldContents: {
    tag100Content: 'Author, Person',
    tag700Content: ' ',
    tag245Content: 'The most important book',
    tagLDRContent: '00000naa\\a2200000uu\\4500',
    tag240Content: 'test 123',
    tag730Content: 'test 123',
    tag852Content: 'KU/CC/DI/A',
    tag866Content: 'Test',
    tag100$0Content: '3052328889 $0 3052044 $0 971255',
    tag650Content: 'sh85095299',
    tag035Content: '(OCoLC)ocn607TST001',
  },
  accordions: {
    contributor: 'Contributor',
    subject: 'Subject',
    titleData: 'Title data',
  },
  contributor: {
    name: 'María de Jesús, de Agreda, sister, 1602-1665',
  },
  sourceValues: {
    folio: 'ADMINISTRATOR, DIKU',
  },
};

describe('New Marc Bib Record and new MARC Holdings record', () => {
  before('Login', () => {
    cy.login(Cypress.env('diku_login'), Cypress.env('diku_password'));
  });

  after('Delete created MARC Holdings record', () => {
    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToHoldings();
    inventorySearchAndFilter.bySource(testData.source);
    inventorySearchAndFilter.selectSearchResultItem();
    marc.openCreatedHoldingView();
    marc.deleteHolding();
  });

  it('C9236 Settings: Add/Edit a custom label (spitfire)', { tags: [testTypes.ideaLabsTests, devTeams.ideaLabsTests] }, () => {
    cy.visit(settingsMenu.eHoldingsPath);
    eHoldingsPackage.customLabel({
      labelOne: 'AutomatingTheFolioApplicationAndTestingApplication',
      labelTwo: 'Test :',
    });
    eHoldingsPackage.verifyCustomLabel();
  });

  it('C380726 Link ""Contributor"" fields when creating ""MARC Bibliographic"" record (spitfire)', { tags: [testTypes.ideaLabsTests, devTeams.ideaLabsTests] }, () => {
    cy.visit(topMenu.inventoryPath);
    inventoryInstance.newMarcBibRecord();
    quickMarcEditor.updateExistingField(
      testData.tags.tag245,
      `$a ${testData.fieldContents.tag245Content}`
    );
    marc.create006Tag();
    marc.create007Tag();
    quickMarcEditor.updateExistingField(
      testData.tags.tagLDR,
      testData.fieldContents.tagLDRContent
    );
    marcAuthority.addNewField(
      6,
      testData.tags.tag100,
      `$a ${testData.fieldContents.tag100Content}`
    );
    inventoryInstance.verifyAndClickLinkIcon(testData.tags.tag100);
    marcAuthorities.switchToSearch();
    inventoryInstance.verifySearchOptions();
    marcAuthorities.searchBy(
      testData.search.searchOption,
      testData.search.value
    );
    marcAuthorities.clickLinkButton();
    marcAuthority.addNewField(
      7,
      testData.tags.tag700,
      `$a ${testData.fieldContents.tag700Content}`
    );
    inventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
    marcAuthorities.switchToSearch();
    inventoryInstance.verifySearchOptions();
    marcAuthorities.searchBy(
      testData.search.searchOption,
      testData.search.value
    );
    marcAuthorities.clickLinkButton();
    marc.saveAndClose();
    inventoryInstance.editMarcBibliographicRecord();
    marc.crossIcon();
    inventoryInstance.viewSource();
    marc.crossIcon();
    inventorySearchAndFilter.switchToBrowseTab();
    browseContributors.select();
    browseContributors.browse(testData.contributor.name);
    browseContributors.checkSearchResultRecord(testData.contributor.name);
  });

  it('C350646 Create a new MARC Holdings record for existing ""Instance"" record (Spitfire)', { tags: [testTypes.ideaLabsTests, devTeams.ideaLabsTests] }, () => {
    cy.visit(topMenu.inventoryPath);
    inventorySearchAndFilter.switchToHoldings();
    inventorySearchAndFilter.bySource(testData.source);
    inventorySearchAndFilter.selectSearchResultItem();
    inventoryInstance.goToMarcHoldingRecordAdding();
    quickMarcEditor.updateExistingField(
      testData.tags.tag852,
      `$b ${testData.fieldContents.tag852Content}`
    );
    marcAuthority.addNewField(
      5,
      testData.tags.tag866,
      `$a ${testData.fieldContents.tag866Content}`
    );
    marc.saveAndClose();
    cy.wait(5000); // Wait Needed: need to wait until the View Source Button will be enabled
    marc.crossIcon();
    marc.openCreatedHoldingView();
    holdingsRecordView.viewSource();
    marc.crossIcon();
    marc.recordLastUpdated();
    marc.checkFieldContentMatch();
  });

  it('C380747 Add non-controllable subfields to a linked field when creating ""MARC Bibliographic"" record (spitfire)', { tags: [testTypes.ideaLabsTests, devTeams.ideaLabsTests] }, () => {
    cy.visit(topMenu.inventoryPath);
    inventoryInstance.newMarcBibRecord();
    quickMarcEditor.checkReadOnlyTags();
    quickMarcEditor.updateExistingField(
      testData.tags.tag245,
      `$a ${testData.fieldContents.tag245Content}`
    );
    marc.create006Tag();
    marc.create007Tag();
    quickMarcEditor.updateExistingField(
      testData.tags.tagLDR,
      testData.fieldContents.tagLDRContent
    );
    marcAuthority.addNewField(
      4,
      testData.tags.tag240,
      `$a ${testData.fieldContents.tag240Content}`
    );
    marcAuthority.addNewField(
      5,
      testData.tags.tag730,
      `$a ${testData.fieldContents.tag730Content}`
    );
    inventoryInstance.verifyAndClickLinkIcon(testData.tags.tag240);
    marcAuthorities.switchToSearch();
    inventoryInstance.verifySearchOptions();
    marcAuthorities.searchBy(
      testData.search240.searchOption,
      testData.search240.value
    );
    marcAuthorities.clickLinkButton();
    inventoryInstance.verifyAndClickLinkIcon(testData.tags.tag730);
    marcAuthorities.switchToSearch();
    inventoryInstance.verifySearchOptions();
    marcAuthorities.searchBy(
      testData.search730.searchOption,
      testData.search730.value
    );
    marcAuthorities.clickLinkButton();
    inventoryInstance.verifyUnlinkIcon(testData.tags.tag240);
    inventoryInstance.verifyUnlinkIcon(testData.tags.tag730);
    marc.saveAndClose();
    inventoryInstance.editMarcBibliographicRecord();
    inventoryInstance.verifyUnlinkIcon(testData.tags.tag240);
    inventoryInstance.verifyUnlinkIcon(testData.tags.tag730);
  });

  it('C389495 Auto-linking fields with multiple ""$0"" when creating new ""MARC Bib"" record (spitfire)', { tags: [testTypes.ideaLabsTests, devTeams.ideaLabsTests] }, () => {
    cy.visit(topMenu.inventoryPath);
    inventoryInstance.newMarcBibRecord();
    quickMarcEditor.updateExistingField(
      testData.tags.tag245,
      `$a ${testData.fieldContents.tag245Content}`
    );
    marc.create006Tag();
    marc.create007Tag();
    marcAuthority.addNewField(
      4,
      testData.tags.tag100,
      `$0 ${testData.fieldContents.tag100$0Content}`
    );
    marcAuthority.addNewField(
      5,
      testData.tags.tag650,
      `$0 ${testData.fieldContents.tag650Content}`
    );
    // Not able to save linking issue
    marcAuthorities.clickLinkButton();
    marc.saveAndClose();
    inventoryInstance.viewSource();
  });

  it('C380736 Search created ""MARC bib"" record by Title, OCLC number (spitfire)', { tags: [testTypes.ideaLabsTests, devTeams.ideaLabsTests] }, () => {
    cy.visit(topMenu.inventoryPath);
    inventoryInstance.newMarcBibRecord();
    quickMarcEditor.updateExistingField(
      testData.tags.tag245,
      `$a ${testData.fieldContents.tag245Content}`
    );
    marc.create006Tag();
    marc.create007Tag();
    marcAuthority.addNewField(
      4,
      testData.tags.tag035,
      `$0 ${testData.fieldContents.tag035Content}`
    );
  });
});
