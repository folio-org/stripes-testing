import uuid from 'uuid';
import Permissions from '../../../support/dictionary/permissions';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import { BROWSE_CALL_NUMBER_OPTIONS } from '../../../support/constants';
import InventoryHoldings from '../../../support/fragments/inventory/holdings/inventoryHoldings';
import ItemRecordNew from '../../../support/fragments/inventory/item/itemRecordNew';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import InteractorsTools from '../../../support/utils/interactorsTools';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C365111_Instance_${randomPostfix}`,
      callNumberValue: `AT_C365111_CallNumber_${randomPostfix}`,
      contributorValue: `AT_C365111_Contributor_${randomPostfix}`,
      invalidQuery: '*net',
      contributorsOption: 'Contributors',
      subjectsOption: 'Subjects',
      callNumberOption: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
      locationAccordionName: 'Effective location (item)',
      nameTypeAccordionName: 'Name type',
      subjectSourceAccordionName: 'Subject source',
      subjectTypeAccordionName: 'Subject type',
      errorCalloutText: 'Error returning results. Please retry or revise your search.',
    };
    let instanceId;
    let holdingsId;
    let instanceTypeId;
    let locationId;
    let locationName;
    let holdingsSourceId;
    let loanTypeId;
    let materialTypeId;
    let contributorNameTypeId;
    let contributorNameTypeName;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C365111');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
          locationName = res.name;
        });
        InventoryHoldings.getHoldingsFolioSource().then((folioSource) => {
          holdingsSourceId = folioSource.id;
        });
        cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
          loanTypeId = res[0].id;
        });
        cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((matType) => {
          materialTypeId = matType.id;
        });
        BrowseContributors.getContributorNameTypes({ searchParams: { limit: 1 } }).then(
          (contributorNameTypes) => {
            contributorNameTypeId = contributorNameTypes[0].id;
            contributorNameTypeName = contributorNameTypes[0].name;
          },
        );
      })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: testData.instanceTitle,
              contributors: [
                {
                  name: testData.contributorValue,
                  contributorNameTypeId,
                  contributorTypeText: '',
                  primary: false,
                },
              ],
            },
          }).then((instanceData) => {
            instanceId = instanceData.instanceId;
          });
        })
        .then(() => {
          InventoryHoldings.createHoldingRecordViaApi({
            instanceId,
            permanentLocationId: locationId,
            sourceId: holdingsSourceId,
          }).then((holdingData) => {
            holdingsId = holdingData.id;
          });
        })
        .then(() => {
          ItemRecordNew.createViaApi({
            holdingsId,
            itemBarcode: uuid(),
            materialTypeId,
            permanentLoanTypeId: loanTypeId,
            itemLevelCallNumber: testData.callNumberValue,
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uiCallNumberBrowse.gui,
            Permissions.uiInventoryViewInstances.gui,
            Permissions.uiSubjectBrowse.gui,
          ]).then((userProperties) => {
            user = userProperties;
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
      Users.deleteViaApi(user.userId);
    });

    it(
      'C365111 Navigation from "Browse" page to default page for Search in "Inventory" app (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C365111'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.validateBrowseToggleIsSelected();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberValue);
        BrowseContributors.waitForContributorToAppear(testData.contributorValue);

        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.toggleAccordionByName(testData.locationAccordionName);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
          testData.locationAccordionName,
        );
        cy.ifConsortia(false, () => {
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            testData.locationAccordionName,
            locationName,
          );
          BrowseCallNumber.checkSearchResultsTable();
        });

        BrowseContributors.select();
        InventorySearchAndFilter.toggleAccordionByName(testData.nameTypeAccordionName);
        InventorySearchAndFilter.toggleAccordionByName(testData.nameTypeAccordionName, false);
        InventorySearchAndFilter.toggleAccordionByName(testData.nameTypeAccordionName);
        InventorySearchAndFilter.checkOptionsWithCountersExistInAccordion(
          testData.nameTypeAccordionName,
        );
        InventorySearchAndFilter.verifyNumberOfSelectedOptionsInMultiSelectFilter(
          testData.nameTypeAccordionName,
          0,
        );
        InventorySearchAndFilter.selectMultiSelectFilterOption(
          testData.nameTypeAccordionName,
          contributorNameTypeName,
        );
        BrowseContributors.checkSearchResultsTable();

        InventorySearchAndFilter.fillInBrowseSearch(testData.invalidQuery);
        InventorySearchAndFilter.checkSearchButtonEnabled();

        InventorySearchAndFilter.clickSearch();
        InteractorsTools.checkCalloutErrorMessage(testData.errorCalloutText);

        BrowseSubjects.select();
        InventorySearchAndFilter.clickAccordionByName(testData.subjectSourceAccordionName);
        InventorySearchAndFilter.clickAccordionByName(testData.subjectTypeAccordionName);

        InventorySearchAndFilter.switchToSearchTab();
        InventorySearchAndFilter.verifySearchToggleButtonSelected();
        InventoryInstances.waitContentLoading();
      },
    );
  });
});
