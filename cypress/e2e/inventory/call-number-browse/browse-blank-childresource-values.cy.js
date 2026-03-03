import Permissions from '../../../support/dictionary/permissions';
import Users from '../../../support/fragments/users/users';
import TopMenu from '../../../support/fragments/topMenu';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';

const instanceTitle = 'C1003540 Instance';
const callNumberValue = '\nCall number with line break';
const classificationValue = '\nClassification with line break';
const contributorValue = '\nContributor with line break';
const subjectValue = '\nSubject with line break';

const callNumberValueNoNewline = 'Call number with line break';
const classificationValueNoNewline = 'Classification with line break';
const contributorValueNoNewline = 'Contributor with line break';
const subjectValueNoNewline = 'Subject with line break';

let user;
let instanceId;
let holdingsId;
let itemId;

describe('Inventory', () => {
  describe('Browse with blank childresource values', () => {
    before('Create user and test data', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUser) => {
        user = createdUser;
      });

      cy.then(() => {
        cy.okapiRequest({
          method: 'POST',
          path: '/instance-storage/instances',
          body: {
            source: 'FOLIO',
            title: instanceTitle,
            contributors: [
              {
                authorityId: null,
                contributorNameTypeId: '2e48e713-17f3-4c13-a9f8-23845bb210aa',
                name: contributorValue,
                contributorTypeId: '97082157-5900-4c4c-a6d8-2e6c13f22ef1',
                contributorTypeText: null,
                primary: false,
              },
            ],
            subjects: [
              {
                authorityId: null,
                value: subjectValue,
                sourceId: null,
                typeId: 'd6488f88-1e74-40ce-81b5-b19a928ff5b7',
              },
            ],
            classifications: [
              {
                classificationNumber: classificationValue,
                classificationTypeId: 'ce176ace-a53e-4b4d-aa89-725ed7b2edac',
              },
            ],
            instanceTypeId: '6312d172-f0cf-40f6-b27d-9fa8feaf332f',
          },
        }).then((instanceRes) => {
          instanceId = instanceRes.body.id;

          cy.okapiRequest({
            method: 'POST',
            path: '/holdings-storage/holdings',
            body: {
              instanceId,
              sourceId: 'f32d531e-df79-46b3-8932-cdd35f7a2264',
              permanentLocationId: '53cf956f-c1df-410b-8bea-27f712cca7c0',
            },
          }).then((holdingsRes) => {
            holdingsId = holdingsRes.body.id;

            cy.okapiRequest({
              method: 'POST',
              path: '/item-storage/items',
              body: {
                status: { name: 'Available' },
                holdingsRecordId: holdingsId,
                materialTypeId: '1a54b431-2e4f-452d-9cae-9cee66c9a892',
                permanentLoanTypeId: '2b94c631-fca9-4892-a730-03ee529ffe27',
                itemLevelCallNumber: callNumberValue,
              },
            }).then((itemRes) => {
              itemId = itemRes.body.id;
            });
          });
        });
      }).then(() => {
        cy.login(user.username, user.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
        InventorySearchAndFilter.switchToBrowseTab();
      });
    });

    after('Delete user and test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      if (itemId) cy.okapiRequest({ method: 'DELETE', path: `/item-storage/items/${itemId}` });
      if (holdingsId) cy.okapiRequest({ method: 'DELETE', path: `/holdings-storage/holdings/${holdingsId}` });
      if (instanceId) cy.okapiRequest({ method: 'DELETE', path: `/instance-storage/instances/${instanceId}` });
    });

    it(
      'C1003540 Browse for blank values in childresource fields (spitfire)',
      { tags: ['extendedPath', 'spitfire', 'C1003540'] },
      () => {
        // 1. Browse Call Number
        InventorySearchAndFilter.selectBrowseCallNumbers();
        InventorySearchAndFilter.browseSearch(callNumberValue);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValueNoNewline);
        BrowseCallNumber.checkNumberOfTitlesForRow(callNumberValueNoNewline, 1);
        BrowseCallNumber.checkValuePresentForRow(callNumberValueNoNewline, 2, '1');

        // 2. Browse Classification
        InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup('Classification (all)');
        InventorySearchAndFilter.browseSearch(classificationValue);
        BrowseClassifications.verifyValueInResultTableIsHighlighted(classificationValueNoNewline);
        BrowseClassifications.checkNumberOfTitlesInRow(classificationValueNoNewline, '1');

        // 3. Browse Contributors
        BrowseContributors.selectContributorsOption();
        InventorySearchAndFilter.browseSearch(contributorValue);
        BrowseContributors.checkSearchResultRecord(contributorValueNoNewline);
        BrowseContributors.checkNumberOfTitlesInRow(contributorValueNoNewline, '1');

        // 4. Browse Subjects
        BrowseSubjects.select();
        InventorySearchAndFilter.browseSearch(subjectValue);
        BrowseSubjects.checkValueIsBold(subjectValueNoNewline);
        BrowseSubjects.checkNumberOfTitlesInRow(subjectValueNoNewline, '1');
      },
    );
  });
});
