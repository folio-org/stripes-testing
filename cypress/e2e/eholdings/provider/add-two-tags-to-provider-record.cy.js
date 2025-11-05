import { Permissions } from '../../../support/dictionary';
import {
  EHoldingsProviders,
  EHoldingsProvidersSearch,
  EHoldingsSearch,
} from '../../../support/fragments/eholdings';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

describe('eHoldings', () => {
  describe('Provider', () => {
    const testData = {
      providerName: 'EBSCO',
    };

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.moduleeHoldingsEnabled.gui,
        Permissions.uieHoldingsRecordsEdit.gui,
        Permissions.uiTagsPermissionAll.gui,
      ]).then((userProperties) => {
        testData.user = userProperties;

        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.eholdingsPath,
          waiter: EHoldingsSearch.waitLoading,
        });
      });
    });

    after('Delete user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C754 Add two tags to a provider record (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C754'] },
      () => {
        EHoldingsSearch.waitLoading();
        EHoldingsProvidersSearch.byProvider(testData.providerName);
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.verifyProviderHeaderTitle(testData.providerName);

        testData.addedTag1 = EHoldingsProviders.addTag();
        cy.wait(1000);
        testData.addedTag2 = EHoldingsProviders.addTag();
        cy.wait(1000);

        EHoldingsProviders.verifyExistingTags(testData.addedTag1, testData.addedTag2);
        cy.visit(TopMenu.eholdingsPath);
        EHoldingsSearch.waitLoading();
        EHoldingsProvidersSearch.byProvider(testData.providerName);
        EHoldingsProviders.viewProvider();
        EHoldingsProviders.verifyProviderHeaderTitle(testData.providerName);
        cy.wait(2000);
        EHoldingsProviders.verifyExistingTags(testData.addedTag1, testData.addedTag2);
        EHoldingsProviders.removeExistingTags();
      },
    );
  });
});
