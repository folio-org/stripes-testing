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

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const randomPostfix = getRandomPostfix();
    const testData = {
      instanceTitle: `AT_C396370_Instance_${randomPostfix}`,
      callNumberValue: `AT_C396370_CallNumber_${randomPostfix}`,
      contributorValue: `AT_C396370_Contributor_${randomPostfix}`,
      subjectValue: `AT_C396370_Subject_${randomPostfix}`,
      query: 'p',
      contributorsOption: 'Contributors',
      subjectsOption: 'Subjects',
      callNumberOption: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
      deleteKeyCode: '{del}',
      backspaceKeyCode: '{backspace}',
    };
    let instanceId;
    let holdingsId;
    let instanceTypeId;
    let locationId;
    let holdingsSourceId;
    let loanTypeId;
    let materialTypeId;
    let contributorNameTypeId;
    let user;

    before('Create test data', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C396370');

      cy.then(() => {
        cy.getInstanceTypes({ limit: 1, query: 'source=rdacontent' }).then((instanceTypes) => {
          instanceTypeId = instanceTypes[0].id;
        });
        cy.getLocations({ limit: 1, query: '(isActive=true and name<>"AT_*")' }).then((res) => {
          locationId = res.id;
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
          },
        );
      })
        .then(() => {
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              instanceTypeId,
              title: testData.instanceTitle,
              subjects: [{ value: testData.subjectValue }],
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
            Permissions.inventoryAll.gui,
            Permissions.uiInventoryMoveItems.gui,
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
      'C396370 Browse results list is cleared when browse input field is cleared (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C396370'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
          authRefresh: true,
        });
        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.verifyKeywordsAsDefault();

        BrowseCallNumber.waitForCallNumberToAppear(testData.callNumberValue);
        BrowseSubjects.waitForSubjectToAppear(testData.subjectValue);
        BrowseContributors.waitForContributorToAppear(testData.contributorValue);

        BrowseContributors.select();
        BrowseContributors.browse(testData.query);
        BrowseContributors.checkSearchResultsTable();

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.query);
        InventorySearchAndFilter.checkBrowseOptionSelected(testData.contributorsOption);
        BrowseContributors.checkSearchResultsTable();

        InventorySearchAndFilter.checkSearchButtonEnabled();
        InventorySearchAndFilter.clearBrowseInputField();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();

        BrowseContributors.browse(testData.query);
        BrowseContributors.checkSearchResultsTable();

        InventorySearchAndFilter.deleteQueryUsingButton(
          testData.query.length,
          testData.backspaceKeyCode,
        );
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.checkBrowseOptionSelected(testData.callNumberOption);
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        BrowseContributors.browse(testData.query);
        BrowseCallNumber.checkSearchResultsTable();

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.query);
        InventorySearchAndFilter.checkBrowseOptionSelected(testData.callNumberOption);
        BrowseCallNumber.checkSearchResultsTable();

        InventorySearchAndFilter.clearBrowseInputField();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();

        BrowseContributors.browse(testData.query);
        BrowseCallNumber.checkSearchResultsTable();

        InventorySearchAndFilter.deleteQueryUsingButton(
          testData.query.length,
          testData.deleteKeyCode,
        );
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        BrowseSubjects.select();
        InventorySearchAndFilter.checkBrowseOptionSelected(testData.subjectsOption);
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        BrowseContributors.browse(testData.query);
        BrowseSubjects.checkSearchResultsTable();

        InventorySearchAndFilter.switchToBrowseTab();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent(testData.query);
        InventorySearchAndFilter.checkBrowseOptionSelected(testData.subjectsOption);
        BrowseSubjects.checkSearchResultsTable();

        InventorySearchAndFilter.deleteQueryUsingButton(
          testData.query.length,
          testData.backspaceKeyCode,
        );
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
        InventorySearchAndFilter.checkBrowseSearchInputFieldContent('');

        BrowseContributors.browse(testData.query);
        BrowseSubjects.checkSearchResultsTable();

        InventorySearchAndFilter.checkSearchButtonEnabled();
        InventorySearchAndFilter.clearBrowseInputField();
        InventorySearchAndFilter.verifyBrowseResultsEmptyPane();
      },
    );
  });
});
