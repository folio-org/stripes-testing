import permissions from '../../../support/dictionary/permissions';
import EHoldingsNewCustomPackage from '../../../support/fragments/eholdings/eHoldingsNewCustomPackage';
import EHoldingsPackageView from '../../../support/fragments/eholdings/eHoldingsPackageView';
import EHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsPackagesSearch from '../../../support/fragments/eholdings/eHoldingsPackagesSearch';
import EHoldingSearch from '../../../support/fragments/eholdings/eHoldingsSearch';
import EHoldingsTitlesSearch from '../../../support/fragments/eholdings/eHoldingsTitlesSearch';
import AccessStatusTypes from '../../../support/fragments/settings/eholdings/accessStatusTypes';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import { EHOLDINGS_PACKAGE_CONTENT_TYPES } from '../../../support/constants';
import {
  FILTER_STATUSES,
  PACKAGE_TYPES,
} from '../../../support/fragments/eholdings/eholdingsConstants';

describe('eHoldings', () => {
  describe('Package', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      customPackageName: `C692_package_${randomPostfix}`,
      customPackageAlternateName: `C692_package_alternate_${randomPostfix}`,
      nonexistentPackageName: `C692_package_nonexistent_${randomPostfix}`,
      packageDisplayName: `C692_package_displayname_${randomPostfix}`,
      contentType: EHOLDINGS_PACKAGE_CONTENT_TYPES.E_BOOK,
      providerName: 'API DEV CORPORATE CUSTOMER',
      startDate: '10/10/2023',
      endDate: '12/31/2032',
      accessStatusTypeName: `C692_AccessType_${randomPostfix}`,
      createdAccessStatusType: false,
      accessStatusTypeId: null,
    };

    before('Creating user, data, logging in', () => {
      cy.getAdminToken();
      AccessStatusTypes.getAccessStatusTypesForDefaultKbViaApi().then((types) => {
        if (types.length) {
          testData.accessStatusTypeName = types[0].attributes.name;
        } else {
          AccessStatusTypes.createAccessStatusTypeForDefaultKbViaApi(
            testData.accessStatusTypeName,
          ).then((id) => {
            testData.accessStatusTypeId = id;
            testData.createdAccessStatusType = true;
          });
        }
      });

      cy.createTempUser([
        permissions.uieHoldingsTitlesPackagesCreateDelete.gui,
        permissions.uieHoldingsRecordsEdit.gui,
        permissions.uieHoldingsPackageTitleSelectUnselect.gui,
      ]).then((userProperties) => {
        testData.userId = userProperties.userId;
        cy.login(userProperties.username, userProperties.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsTitlesSearch.waitLoading,
        });
      });
    });

    after('Deleting user, data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.userId);
      EHoldingsPackages.deletePackageViaAPI(testData.customPackageName);

      if (testData.createdAccessStatusType) {
        AccessStatusTypes.deleteAccessStatusTypeFromDefaultKbViaApi(testData.accessStatusTypeId);
      }
    });

    // Will FAIL until https://folio-org.atlassian.net/browse/UIEH-1564 is fixed
    it(
      'C692 Create a custom package (promin)',
      { tags: ['criticalPath', 'promin', 'C692'] },
      () => {
        // Step 1: Switch to Packages tab; "New" button displays
        EHoldingSearch.switchToPackages();
        EHoldingsPackages.verifyNewPackageButtonExists();

        // Step 2: Open "New custom package" pane; verify its fields
        EHoldingsPackages.createNewPackage();
        EHoldingsNewCustomPackage.waitLoading();
        EHoldingsNewCustomPackage.verifyNewCustomPackageFormFields();

        // Step 3: Hover/click the info icon next to "Package display name" and verify tooltip
        // Not yet implemented in the app - see https://folio-org.atlassian.net/browse/UIEH-1535
        // EHoldingsNewCustomPackage.verifyPackageDisplayNameInfoPopover();

        // Step 4: Hover/click the info icon next to "Custom alternate names" and verify tooltip
        EHoldingsNewCustomPackage.verifyCustomAlternateNamesInfoPopover();

        // Step 5: Fill Name field; Save & close becomes enabled
        EHoldingsNewCustomPackage.fillInRequiredProperties(testData.customPackageName);
        EHoldingsNewCustomPackage.verifySaveButtonEnabled();

        // Step 6: Select content type
        EHoldingsNewCustomPackage.chooseContentType(testData.contentType);

        // Step 7: Select access status type
        EHoldingsNewCustomPackage.chooseAccessStatusType(testData.accessStatusTypeName);

        // Steps 8-9: Add and fill custom alternate name
        EHoldingsNewCustomPackage.addAlternateName(testData.customPackageAlternateName);

        // Step 10: Fill package display name
        EHoldingsNewCustomPackage.fillPackageDisplayName(testData.packageDisplayName);

        // Steps 11-12: Add and fill date range
        EHoldingsNewCustomPackage.addDateRange();
        EHoldingsNewCustomPackage.verifyDateRangeFieldsExist();
        EHoldingsNewCustomPackage.fillDateRange(testData.startDate, testData.endDate);

        // Step 13: Save & close; verify created package detail view
        cy.intercept('eholdings/packages').as('createPackage');
        EHoldingsNewCustomPackage.saveAndClose();
        EHoldingsNewCustomPackage.checkPackageCreatedCallout();
        cy.wait('@createPackage').then(() => {
          EHoldingsPackageView.waitLoading();
          EHoldingsPackageView.verifyPackageDetailViewIsOpened(
            testData.customPackageName,
            0,
            FILTER_STATUSES.SELECTED,
          );
          EHoldingsPackageView.verifyProvider(testData.providerName);
          EHoldingsPackages.verifyContentType(testData.contentType);
          EHoldingsPackageView.verifyPackageType(PACKAGE_TYPES.CUSTOM);
          EHoldingsPackageView.verifyTotalTitles(0);
          EHoldingsPackageView.verifyTitlesSelected(0);
          EHoldingsPackageView.verifyPackageDisplayName(testData.packageDisplayName);
          EHoldingsPackageView.verifyCustomAlternateNames(testData.customPackageAlternateName);
          EHoldingsPackageView.verifyExclusionOptions();
          // EHoldingsPackageView.verifyAccessStatusType(testData.accessStatusTypeName);
          EHoldingsPackageView.verifyCoverageDatesSet(testData.startDate, testData.endDate);

          // Step 14: Close package detail view; Packages tab is selected
          EHoldingsPackageView.close();
          EHoldingSearch.switchToPackages();

          // Steps 15-16: Search created package by name and by alternate name
          EHoldingsPackages.verifyPackageExistsViaAPI(testData.customPackageName, true, 60);
          EHoldingsPackagesSearch.byName(testData.customPackageName);
          EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
          EHoldingsPackagesSearch.byName(testData.nonexistentPackageName);
          EHoldingsPackages.checkNoResultsFound(testData.nonexistentPackageName);
          EHoldingsPackagesSearch.byName(testData.customPackageAlternateName);
          EHoldingsPackages.verifyPackageInResults(testData.customPackageName);
        });
      },
    );
  });
});
