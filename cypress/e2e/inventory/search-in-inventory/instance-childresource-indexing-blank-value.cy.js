import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';
import BrowseClassifications from '../../../support/fragments/inventory/search/browseClassifications';
import {
  BROWSE_CALL_NUMBER_OPTIONS,
  BROWSE_CLASSIFICATION_OPTIONS,
  CLASSIFICATION_IDENTIFIER_TYPES,
  ITEM_STATUS_NAMES,
} from '../../../support/constants';
import BrowseContributors from '../../../support/fragments/inventory/search/browseContributors';
import BrowseSubjects from '../../../support/fragments/inventory/search/browseSubjects';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';

describe('Inventory', () => {
  describe('Search in Inventory', () => {
    describe('Index management', () => {
      const randomPostfix = getRandomPostfix();
      const instanceTitle = `AT_C1003540_FolioInstance_${randomPostfix}`;
      const callNumberValue = `CallNumberC1003540 ${randomPostfix}`;
      const classificationValue = `ClassificationC1003540 ${randomPostfix}`;
      const contributorValue = `ContributorC1003540 ${randomPostfix}`;
      const subjectValue = `SubjectC1003540 ${randomPostfix}`;
      const subjectBrowseOption = 'Subjects';
      const contributorsBrowseOption = 'Contributors';

      let instanceId;
      let user;
      let instanceTypeId;
      let locationId;
      let loanTypeId;
      let materialTypeId;
      let holdingsTypeId;
      let contributorNameTypeId;

      before('Creating user and test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteFullInstancesByTitleViaApi('C1003540');

        cy.then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((createdUserProperties) => {
            user = createdUserProperties;
          });

          cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
            instanceTypeId = instanceTypes[0].id;
          });
          cy.getHoldingTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            holdingsTypeId = res[0].id;
          });
          BrowseContributors.getContributorNameTypes().then((contributorNameTypes) => {
            contributorNameTypeId = contributorNameTypes[0].id;
          });
          cy.getLocations({
            limit: 1,
            query: '(isActive=true and name<>"AT_*" and name<>"auto*")',
          }).then((res) => {
            locationId = res.id;
          });
          cy.getLoanTypes({ limit: 1, query: 'name<>"AT_*"' }).then((res) => {
            loanTypeId = res[0].id;
          });
          cy.getMaterialTypes({ limit: 1, query: 'source=folio' }).then((res) => {
            materialTypeId = res.id;
          });
        })
          .then(() => {
            InventoryInstances.createFolioInstanceViaApi({
              instance: {
                instanceTypeId,
                title: instanceTitle,
                classifications: [
                  {
                    classificationNumber: `\n${classificationValue}`,
                    classificationTypeId: CLASSIFICATION_IDENTIFIER_TYPES.LC,
                  },
                ],
                contributors: [
                  {
                    authorityId: null,
                    contributorTypeText: null,
                    name: `\n${contributorValue}`,
                    contributorNameTypeId,
                  },
                ],
                subjects: [
                  {
                    authorityId: null,
                    sourceId: null,
                    value: `\n${subjectValue}`,
                  },
                ],
                publication: [],
                publicationFrequency: [],
                publicationRange: [],
                electronicAccess: [],
                instanceFormatIds: [],
                instanceFormats: [],
                physicalDescriptions: [],
                languages: [],
                notes: [],
                administrativeNotes: [],
                previouslyHeld: false,
                discoverySuppress: false,
                statisticalCodeIds: [],
                holdingsRecords2: [],
                natureOfContentTermIds: [],
              },
              holdings: [
                {
                  holdingsTypeId,
                  permanentLocationId: locationId,
                },
              ],
              items: [
                {
                  status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                  permanentLoanType: { id: loanTypeId },
                  materialType: { id: materialTypeId },
                  itemLevelCallNumber: `\n${callNumberValue}`,
                },
              ],
            }).then((instanceData) => {
              instanceId = instanceData.instanceId;
            });
          })
          .then(() => {
            cy.login(user.username, user.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
              authRefresh: true,
            });
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
            InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
            InventorySearchAndFilter.checkBrowseOptionSelected(
              BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
            );
          });
      });

      after('Deleting created user and test data', () => {
        cy.getAdminToken();
        InventoryInstances.deleteInstanceAndItsHoldingsAndItemsViaApi(instanceId);
        Users.deleteViaApi(user.userId);
      });

      it(
        'C1003540 Verify ChildResource indexing when it has blank value (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C1003540'] },
        () => {
          BrowseCallNumber.waitForCallNumberToAppear(callNumberValue);
          BrowseClassifications.waitForClassificationNumberToAppear(classificationValue);
          BrowseContributors.waitForContributorToAppear(contributorValue);
          BrowseSubjects.waitForSubjectToAppear(subjectValue);

          InventorySearchAndFilter.browseSearch(callNumberValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(callNumberValue);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 1, instanceTitle);
          BrowseCallNumber.checkValuePresentForRow(callNumberValue, 2, '1');

          InventorySearchAndFilter.selectBrowseOptionFromClassificationGroup(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.checkBrowseOptionSelected(
            BROWSE_CLASSIFICATION_OPTIONS.CALL_NUMBERS_ALL,
          );
          InventorySearchAndFilter.browseSearch(classificationValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(classificationValue);
          BrowseCallNumber.checkValuePresentForRow(classificationValue, 1, '1');

          InventorySearchAndFilter.selectBrowseOption(contributorsBrowseOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(contributorsBrowseOption);
          InventorySearchAndFilter.browseSearch(contributorValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(contributorValue);
          BrowseCallNumber.checkValuePresentForRow(contributorValue, 3, '1');

          InventorySearchAndFilter.selectBrowseOption(subjectBrowseOption);
          InventorySearchAndFilter.checkBrowseOptionSelected(subjectBrowseOption);
          InventorySearchAndFilter.browseSearch(subjectValue);
          BrowseCallNumber.valueInResultTableIsHighlighted(subjectValue);
          BrowseCallNumber.checkValuePresentForRow(subjectValue, 3, '1');
        },
      );
    });
  });
});
