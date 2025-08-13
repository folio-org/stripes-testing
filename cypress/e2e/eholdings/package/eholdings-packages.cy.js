import { Permissions } from '../../../support/dictionary';
import EHoldingsPackage from '../../../support/fragments/eholdings/eHoldingsPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import UHoldingsProvidersSearch from '../../../support/fragments/eholdings/eHoldingsProvidersSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitle from '../../../support/fragments/eholdings/eHoldingsTitle';
import eHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import { FILTER_STATUSES } from '../../../support/fragments/eholdings/eholdingsConstants';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import DateTools from '../../../support/utils/dateTools';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('eHoldings', () => {
  describe('Package', () => {
    const testData = {
      titleOption: 'Title',
      issnOption: 'ISSN/ISBN',
      publisherOption: 'Publisher',
      subjectOption: 'Subject',
    };

    let userId;

    before(() => {
      cy.getAdminToken();
    });
    afterEach(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C3463 Add two tags to package [Edinburgh Scholarship Online] (spitfire)',
      { tags: ['smoke', 'spitfire', 'shiftLeft', 'C3463'] },
      () => {
        // TODO: "Tags: All permissions" doesn't have displayName. It's the reason why there is related permission name in response, see https://issues.folio.org/browse/UITAG-51
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uiTagsPermissionAll.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsTitlesSearch.waitLoading,
          });
          EHoldingSearch.switchToPackages();
          EHoldingsPackagesSearch.byName();
          EHoldingsPackages.openPackage().then((selectedPackage) => {
            const addedTag1 = EHoldingsPackage.addTag();
            const addedTag2 = EHoldingsPackage.addTag();
            EHoldingsPackage.verifyExistingTags(addedTag1, addedTag2);
            EHoldingsPackage.closePackage();
            EHoldingSearch.waitLoading();
            EHoldingsPackagesSearch.byName(selectedPackage);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.verifyExistingTags(addedTag1, addedTag2);
          });
        });
      },
    );

    it(
      'C3464 Update package proxy (spitfire)',
      { tags: ['criticalPathBroken', 'spitfire', 'C3464'] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          EHoldingSearch.switchToPackages();
          UHoldingsProvidersSearch.byProvider('Edinburgh Scholarship Online');
          EHoldingsPackages.openPackage();
          EHoldingsPackage.editProxyActions();
          EHoldingsPackages.changePackageRecordProxy().then((newProxy) => {
            EHoldingsPackage.saveAndClose();
            // additional delay related with update of proxy information in ebsco services
            cy.wait(10000);
            EHoldingsPackages.verifyPackageRecordProxy(newProxy);
          });
        });
      },
    );

    it(
      'C690 Remove a package from your holdings (spitfire)',
      { tags: ['smokeBroken', 'spitfire', 'C690'] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.uieHoldingsPackageTitleSelectUnselect.gui,
          Permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.getNotCustomSelectedPackageIdViaApi().then((specialPackage) => {
            cy.login(userProperties.username, userProperties.password, {
              path: `${TopMenu.eholdingsPath}/packages/${specialPackage.id}`,
              waiter: () => EHoldingsPackage.waitLoading(specialPackage.name),
            });
            cy.wait(1000);
            EHoldingsPackage.removeFromHoldings();
            cy.wait(1000);
            EHoldingsPackage.verifyHoldingStatus(FILTER_STATUSES.NOT_SELECTED);
            cy.wait(1000);
            EHoldingsPackage.filterTitles(FILTER_STATUSES.NOT_SELECTED);
            cy.wait(1000);
            EHoldingsPackage.checkEmptyTitlesList();
            // reset test data
            EHoldingsPackage.addToHoldings();
          });
        });
      },
    );

    it(
      'C695 Package Record: Search all titles included in a package (spitfire)',
      { tags: ['criticalPathBroken', 'spitfire', 'C695'] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          EHoldingSearch.switchToPackages();
          UHoldingsProvidersSearch.byProvider('Wiley Online Library');
          EHoldingsPackagesSearch.bySelectionStatus('Selected');
          EHoldingsPackages.openPackageWithExpectedName('Wiley Online Library');
          EHoldingsPackage.waitLoading('Wiley Online Library');
          EHoldingsPackage.verifySelectedTitleSearchOption(testData.titleOption);
          EHoldingsPackage.searchTitles('About Campus');
          EHoldingsPackage.verifyTitleFound('About Campus');
          EHoldingsPackage.searchTitles('0044-5983', testData.issnOption);
          EHoldingsPackage.verifyTitleFound('Acta Botanica Neerlandica');
          EHoldingsPackage.searchTitles('John Wiley', testData.publisherOption);
          EHoldingsPackageView.selectTitleRecord();
          EHoldingsTitle.verifyPublisherIncludesValue('John Wiley');
          EHoldingsTitle.closeHoldingsTitleView();
          EHoldingsPackage.waitLoading('Wiley Online Library');
          EHoldingsPackage.verifySelectedTitleSearchOption(testData.publisherOption);
          EHoldingsPackage.verifyTitlesSearchQuery('John Wiley');
          EHoldingsPackage.toggleTitlesAccordion(false);
          EHoldingsPackage.toggleTitlesAccordion();
          EHoldingsPackage.verifySelectedTitleSearchOption(testData.publisherOption);
          EHoldingsPackage.verifyTitlesSearchQuery('John Wiley');
          EHoldingsPackage.searchTitles('engineering', testData.subjectOption);
          EHoldingsPackage.verifyTitleFound('Advances in Civil Engineering');
          EHoldingsPackageView.selectTitleRecord();
          EHoldingsTitle.verifySubjectIncludesValue('Engineering');
        });
      },
    );
  });
});

describe('eHoldings', () => {
  describe('Package', () => {
    let userId;
    const defaultPackage = { ...EHoldingsPackages.getdefaultPackage() };

    afterEach(() => {
      cy.getAdminToken();
      Users.deleteViaApi(userId);
    });

    it(
      'C699 Add or edit package custom coverage (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C699'] },
      () => {
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.createPackageViaAPI().then(() => {
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.eholdingsPath,
              waiter: EHoldingsPackages.waitLoading,
            });

            const yesterday = DateTools.getPreviousDayDate();
            const yesterdayPaddingZero = DateTools.clearPaddingZero(yesterday);
            const today = DateTools.getFormattedDate({ date: new Date() }, 'MM/DD/YYYY');
            const todayWithoutPaddingZero = DateTools.clearPaddingZero(today);
            EHoldingSearch.switchToPackages();
            // wait until package is created via API
            cy.wait(15000);
            UHoldingsProvidersSearch.byProvider(defaultPackage.data.attributes.name);
            EHoldingsPackages.openPackage();
            EHoldingsPackage.editProxyActions();
            EHoldingsPackages.fillDateCoverage(yesterday, today);
            EHoldingsPackage.saveAndClose();
            EHoldingsPackages.verifyCustomCoverageDates(
              yesterdayPaddingZero,
              todayWithoutPaddingZero,
            );
            cy.getAdminToken();
            EHoldingsPackages.deletePackageViaAPI(defaultPackage.data.attributes.name);
          });
        });
      },
    );

    it(
      'C3466 Edit/Add a token to the Gale Academic OneFile (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C3466'] },
      () => {
        cy.createTempUser([Permissions.uieHoldingsRecordsEdit.gui]).then((userProperties) => {
          userId = userProperties.userId;
          cy.login(userProperties.username, userProperties.password, {
            path: TopMenu.eholdingsPath,
            waiter: EHoldingsPackages.waitLoading,
          });

          const token = `Test${getRandomPostfix()}`;
          EHoldingSearch.switchToPackages();
          EHoldingsPackagesSearch.byName('Gale Academic OneFile');
          EHoldingsPackages.openPackage();
          EHoldingsPackage.editProxyActions();
          EHoldingsPackage.changeToken(token);
          EHoldingsPackage.saveAndClose();
          // wait until the token to be changed
          cy.wait(10000);
          cy.reload();
          EHoldingsPackage.verifyToken(token);
        });
      },
    );

    it(
      'C703 Set [Show titles in package to patrons] to Hide (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C703'] },
      () => {
        let titleName;
        cy.createTempUser([
          Permissions.uieHoldingsRecordsEdit.gui,
          Permissions.moduleeHoldingsEnabled.gui,
        ]).then((userProperties) => {
          userId = userProperties.userId;
          EHoldingsPackages.createPackageViaAPI().then(({ data: { id } }) => {
            eHoldingsTitles
              .createEHoldingTitleVIaApi({
                packageId: id,
              })
              .then((title) => {
                titleName = title.attributes.name;
              })
              .then(() => {
                cy.login(userProperties.username, userProperties.password, {
                  path: TopMenu.eholdingsPath,
                  waiter: EHoldingsPackages.waitLoading,
                });

                EHoldingSearch.switchToPackages();
                // wait until package is created via API
                cy.wait(15000);
                UHoldingsProvidersSearch.byProvider(defaultPackage.data.attributes.name);
                EHoldingsPackagesSearch.bySelectionStatus('Selected');
                EHoldingsPackages.openPackage();
                EHoldingsPackage.editProxyActions();
                EHoldingsPackageView.patronRadioButton('No');
                EHoldingsPackage.saveAndClose();
                EHoldingsPackageView.waitLoading();
                EHoldingsPackage.waitForTitlesState({
                  packageId: id,
                  titleName,
                  isHidden: true,
                });
                cy.waitForAuthRefresh(() => {
                  cy.reload();
                });
                EHoldingsPackage.verifyTitleFound(titleName);
                EHoldingsPackage.verifyTitleFound('SelectedTitle is set to hide');
                EHoldingsPackageView.verifyAlternativeRadio('No');
                cy.getAdminToken();
                EHoldingsPackages.deletePackageViaAPI(defaultPackage.data.attributes.name);
              });
          });
        });
      },
    );
  });
});
