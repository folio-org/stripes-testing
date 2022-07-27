import eHoldingSearch from '../../support/fragments/eholdings/eHoldingsSearch';
import eHoldingsTitle from '../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsPackage from '../../support/fragments/eholdings/eHoldingsPackage';
import eHoldingsTitles from '../../support/fragments/eholdings/eHoldingsTitles';
import eHoldingsPackages from '../../support/fragments/eholdings/eHoldingsPackages';
import eHoldingsTitlesSearch from '../../support/fragments/eholdings/eHoldingsTitlesSearch';
import eHoldingsResourceView from '../../support/fragments/eholdings/eHoldingsResourceView';
import TopMenu from '../../support/fragments/topMenu';
import eHoldingsResourceEdit from '../../support/fragments/eholdings/eHoldingResourceEdit';
import dateTools from '../../support/utils/dateTools';
import testTypes from '../../support/dictionary/testTypes';
import features from '../../support/dictionary/features';
import devTeams from '../../support/dictionary/devTeams';



describe('eHoldings titles management', () => {
  const testData = {
    addedRangesCount: 0,
    subjectTitle : 'chemical engineering',
    selectedResource: {
      title: 'Preparative biochemistry & biotechnology : an international journal for rapid communications',
      publicationType: 'Journal',
      package: 'Taylor & Francis',
    },
    dateRanges: dateTools.getDateRanges(2).map(range => ({
      startDay : `${dateTools.padWithZero(range.startDay.getMonth() + 1)}/${dateTools.padWithZero(range.startDay.getDate())}/${dateTools.padWithZero(range.startDay.getFullYear())}`,
      endDay : `${dateTools.padWithZero(range.endDay.getMonth() + 1)}/${dateTools.padWithZero(range.endDay.getDate())}/${dateTools.padWithZero(range.endDay.getFullYear())}`
    })),
  };

  before('Çreating user', () => {
    cy.loginAsAdmin();
    cy.getAdminToken();
  });

  beforeEach(() => {
    cy.visit(TopMenu.eholdingsPath);
    eHoldingSearch.switchToTitles();
  });

  it('C16994 Add a title in a package to holdings (spitfire)', { tags:  [testTypes.smoke, features.eHoldings, devTeams.spitfire] }, () => {
    eHoldingsTitlesSearch.bySubject(testData.subjectTitle);
    // findItem();
    eHoldingsTitlesSearch.byPublicationType(testData.selectedResource.publicationType);
    eHoldingsTitlesSearch.bySelectionStatus(eHoldingsTitle.filterStatuses.notSelected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.checkPackagesSelectionStatus(eHoldingsTitle.filterStatuses.notSelected);
    eHoldingsTitle.openResource();
    eHoldingsResourceView.addToHoldings();
    eHoldingsResourceView.checkHoldingStatus(eHoldingsTitle.filterStatuses.selected);
    eHoldingsResourceView.checkActions('21st-century-fuels');
  });

  // TODO: https://issues.folio.org/browse/UIEH-1256
  it('C700 Title: Add or Edit custom coverage (spitfire)', { tags:  [testTypes.smoke, features.eHoldings, devTeams.spitfire] }, () => {
    // test related with special data from Ebsco
    eHoldingsTitlesSearch.byTitle(testData.selectedResource.title);
    eHoldingsTitlesSearch.byPublicationType(testData.selectedResource.publicationType);
    eHoldingsTitlesSearch.bySelectionStatus(eHoldingsTitle.filterStatuses.notSelected);
    eHoldingsTitles.openTitle();
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages(eHoldingsPackage.filterStatuses.selected, testData.selectedResource.package);
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.openResource();
    eHoldingsResourceView.goToEdit();
    eHoldingsResourceEdit.swicthToCustomCoverageDates();

    testData.dateRanges.forEach(range => {
      eHoldingsResourceEdit.setCustomCoverageDates(range, testData.addedRangesCount);
      testData.addedRangesCount++;
    });
    eHoldingsResourceEdit.saveAndClose();
    eHoldingsResourceView.waitLoading();
    eHoldingsResourceView.checkCustomPeriods(testData.dateRanges);

    // revert test data
    // TODO: redesign to api requests
    eHoldingsResourceView.goToEdit();
    eHoldingsResourceEdit.removeExistingCustomeCoverageDates();
  });

  it('C691 Remove a title in a package from your holdings (spitfire)', { tags:  [testTypes.smoke, features.eHoldings, devTeams.spitfire] }, () => {
    eHoldingsTitles.getSelectedNotCustomTitleViaApi('chemical engineering').then(specialTitle => {
      cy.visit(`${TopMenu.eholdingsPath}/titles/${specialTitle.id}`);
      eHoldingsTitle.waitLoading(specialTitle.name);
    });

    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.filterPackages(eHoldingsPackage.filterStatuses.notSelected);
    eHoldingsTitle.waitPackagesLoading();
    eHoldingsTitle.checkPackagesSelectionStatus(eHoldingsPackage.filterStatuses.notSelected);
    eHoldingsTitle.openResource();
    eHoldingsResourceView.checkHoldingStatus(eHoldingsTitle.filterStatuses.notSelected);
    eHoldingsResourceView.removeTitleFromHolding();
    eHoldingsResourceView.checkHoldingStatus(eHoldingsTitle.filterStatuses.notSelected);
  });

  it('C693 Create a custom title. (spitfire)', { tags:  [testTypes.smoke, features.eHoldings] }, () => {
    eHoldingsPackages.getCustomPackageViaApi().then(packageName => {
      const title = eHoldingsTitles.create(packageName);
      eHoldingsResourceView.checkNames(packageName, title);
    });
  });
});
