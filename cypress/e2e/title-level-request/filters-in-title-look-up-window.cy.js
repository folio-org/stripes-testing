import uuid from 'uuid';
import { Permissions } from '../../support/dictionary';
import NewRequest from '../../support/fragments/requests/newRequest';
import getRandomPostfix, { getTestEntityValue } from '../../support/utils/stringTools';
import Requests from '../../support/fragments/requests/requests';
import SelectInstanceModal from '../../support/fragments/requests/selectInstanceModal';
import TitleLevelRequests from '../../support/fragments/settings/circulation/titleLevelRequests';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import PatronGroups from '../../support/fragments/settings/users/patronGroups';
import TopMenu from '../../support/fragments/topMenu';
import UserEdit from '../../support/fragments/users/userEdit';
import Users from '../../support/fragments/users/users';
import Location from '../../support/fragments/settings/tenant/locations/newLocation';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import DateTools from '../../support/utils/dateTools';
import { ITEM_STATUS_NAMES, INSTANCE_SOURCE_NAMES } from '../../support/constants';
import NewInstanceHoldingItem from '../../support/fragments/inventory/holdingsMove/defaultInstanceHoldingItem';

describe('Title Level Request', () => {
  describe('Create Item or Title level request', () => {
    const testData = {
      instanceData: {
        title: `Instance title${getRandomPostfix()}`,
        itemEffectiveLocation: `Location / ${getRandomPostfix()}`,
        language: 'Ainu',
        format: 'audio -- other',
        modeOfIssuance: 'integrating resource',
        natureOfContent: 'bibliography',
        staffSuppress: true,
        suppressFromDiscovery: true,
        dateCreated: DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD'),
        dateUpdated: DateTools.getFormattedDate({ date: new Date() }, 'YYYY-MM-DD'),
        source: INSTANCE_SOURCE_NAMES.FOLIO,
      },
      itemBarcode: uuid(),
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
      patronGroup: {
        name: getTestEntityValue('GroupCircLog'),
      },
      tag: {
        id: uuid(),
        description: uuid(),
        label: uuid(),
      },
    };

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          cy.createInstanceType(NewInstanceHoldingItem.defaultUiInstanceType.body).then((type) => {
            testData.resourceType = type;
          });
          cy.createModesOfIssuans(NewInstanceHoldingItem.defaultModesOfIssuans.body).then(
            (mode) => {
              testData.modeOfIssuance = mode;
            },
          );
          PatronGroups.createViaApi(testData.patronGroup.name).then((patronGroupResponse) => {
            testData.patronGroup.id = patronGroupResponse;
          });
          ServicePoints.createViaApi(testData.servicePoint);
          testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
          Location.createViaApi({
            ...testData.defaultLocation,
            name: testData.instanceData.itemEffectiveLocation,
          });
          cy.getHoldingTypes({ limit: 2 }).then((res) => {
            testData.holdingTypeId = res[0].id;
          });
          cy.getLocations({ limit: 1 }).then((res) => {
            testData.locationId = res.id;
          });
          cy.getLoanTypes({ limit: 2 }).then((res) => {
            testData.loanTypeId = res[0].id;
          });
          cy.getDefaultMaterialType().then((res) => {
            testData.materialTypeId = res.id;
          });
        })
        .then(() => {
          // create the instance with fields for filtering
          InventoryInstances.createFolioInstanceViaApi({
            instance: {
              discoverySuppress: testData.instanceData.suppressFromDiscovery,
              // eslint-disable-next-line spaced-comment
              //staffSuppress: testData.instanceData.staffSuppress,
              previouslyHeld: false,
              source: testData.instanceData.resourceType,
              title: testData.instanceData.title,
              languages: ['ain'],
              instanceTypeId: testData.resourceType.id,
              instanceFormatIds: ['a3549b8c-3282-4a14-9ec3-c1cf294043b9'],
              modeOfIssuanceId: testData.modeOfIssuance.id,
              natureOfContentTermIds: ['f5908d05-b16a-49cf-b192-96d55a94a0d1'],
            },
            holdings: [
              {
                holdingsTypeId: testData.holdingTypeId,
                permanentLocationId: testData.locationId,
              },
            ],
            items: [
              {
                barcode: testData.itemBarcode,
                status: { name: ITEM_STATUS_NAMES.AVAILABLE },
                permanentLoanType: { id: testData.loanTypeId },
                materialType: { id: testData.materialTypeId },
                permanentLocation: { id: testData.defaultLocation.id },
              },
            ],
          }).then((specialInstanceIds) => {
            testData.instanceData.id = specialInstanceIds.instanceId;
          });
        });
      // create tag for updating the instance
      cy.createTagApi(testData.tag).then((id) => {
        testData.tag.id = id;
      });

      TitleLevelRequests.enableTLRViaApi();

      cy.createTempUser(
        [
          Permissions.uiRequestsView.gui,
          Permissions.uiRequestsCreate.gui,
          Permissions.uiRequestsAll.gui,
          Permissions.uiRequestsEdit.gui,
          Permissions.uiInventoryViewInstances.gui,
        ],
        testData.patronGroup.name,
      ).then((user) => {
        testData.user = user;

        UserEdit.addServicePointViaApi(testData.servicePoint.id, user.userId);
        // update the instance adding the tag
        cy.getInstanceById(testData.instanceData.id).then((body) => {
          body.tags = { tagList: [testData.tag.label] };
          cy.updateInstance(body);
        });
        cy.login(testData.user.username, testData.user.password, {
          path: TopMenu.requestsPath,
          waiter: Requests.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(testData.itemBarcode);
        UserEdit.changeServicePointPreferenceViaApi(testData.user.userId, [
          testData.servicePoint.id,
        ]);
        Users.deleteViaApi(testData.user.userId);
        ServicePoints.deleteViaApi(testData.servicePoint.id);
        Location.deleteInstitutionCampusLibraryLocationViaApi(
          testData.defaultLocation.institutionId,
          testData.defaultLocation.campusId,
          testData.defaultLocation.libraryId,
          testData.defaultLocation.id,
        );
        cy.deleteTagApi(testData.tag.id);
        cy.deleteInstanceType(testData.resourceType.id);
        cy.deleteModesOfIssuans(testData.modeOfIssuance.id);
      });
    });

    it(
      'C353601 Verify filters in title look-up window (vega) (TaaS)',
      { tags: ['extendedPathBroken', 'vega', 'C353601'] },
      () => {
        NewRequest.openNewRequestPane();
        NewRequest.waitLoadingNewRequestPage();
        NewRequest.enableTitleLevelRequest();
        NewRequest.openTitleLookUp();
        SelectInstanceModal.waitLoading();

        SelectInstanceModal.filterByEffectiveLocation(testData.instanceData.itemEffectiveLocation);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByLanguage(testData.instanceData.language);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByResourceType(testData.resourceType.name);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByFormat(testData.instanceData.format);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByModeOfIssuance(testData.modeOfIssuance.name);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByNatureOfContent(testData.instanceData.natureOfContent);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterBySuppressFromDiscovery('Yes');
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();
        SelectInstanceModal.filterBySuppressFromDiscovery('No');
        SelectInstanceModal.verifyListResultsNotContains(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        /*
        SelectInstanceModal.filterByStaffSuppress('Yes');
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();
        SelectInstanceModal.filterByStaffSuppress('No');
        SelectInstanceModal.verifyListResultsNotContains(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByDateCreated(
          testData.instanceData.dateCreated,
          testData.instanceData.dateCreated,
        );
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByDateUpdated(
          testData.instanceData.dateUpdated,
          testData.instanceData.dateUpdated,
        );
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();
        */

        SelectInstanceModal.filterBySource(
          testData.instanceData.source,
          testData.instanceData.title,
        );
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();

        SelectInstanceModal.filterByTags(testData.tag.label);
        SelectInstanceModal.verifyListResults(testData.instanceData.title);
        SelectInstanceModal.clickResetAllButton();
      },
    );
  });
});
