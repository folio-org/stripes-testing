import { Permissions } from '../../../support/dictionary';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import BrowseCallNumber from '../../../support/fragments/inventory/search/browseCallNumber';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';
import { CallNumberTypes } from '../../../support/fragments/settings/inventory/instances/callNumberTypes';
import { BROWSE_CALL_NUMBER_OPTIONS, CALL_NUMBER_TYPE_NAMES } from '../../../support/constants';
import { CallNumberBrowseSettings } from '../../../support/fragments/settings/inventory/instances/callNumberBrowse';

describe('Inventory', () => {
  describe('Call Number Browse', () => {
    const testData = {};
    const randomLetters = `C411749${getRandomLetters(7)}`;
    let callNumberTypes = null;
    const getIdByName = (name) => callNumberTypes.find((type) => type.name === name)?.id;
    const rnd = getRandomPostfix();
    const instancePrefix = `AT_C411749_FolioInstance_${rnd}`;
    const localCallNumberTypeName = `AT_C411749_LocalCNType_${rnd}`;
    const locationAccordionName = 'Effective location (item)';
    const callNumbers = [
      { type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, value: `Z668.R411 1749${randomLetters}` },
      { type: CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL, value: `411 H749${randomLetters}` },
      {
        type: CALL_NUMBER_TYPE_NAMES.SUDOC,
        value: `T22.19:M41/2749${randomLetters}`,
      },
      {
        type: CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
        value: `WA 102.5 B5411 2749${randomLetters}`,
      },
      { type: CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, value: `417.49 Slater${randomLetters}` },
      { type: localCallNumberTypeName, value: `AT_C411749 Local ${randomLetters}` },
      { type: CALL_NUMBER_TYPE_NAMES.UDC, value: `117.49${randomLetters}` },
    ];
    const callNumberTypesSettings = [
      { name: BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL, callNumberTypes: [] },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.DEWEY_DECIMAL,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.DEWAY_DECIMAL],
      },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_CONGRESS,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS, localCallNumberTypeName],
      },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.LIBRARY_OF_MEDICINE,
        callNumberTypes: [
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_MEDICINE,
          CALL_NUMBER_TYPE_NAMES.LIBRARY_OF_CONGRESS,
        ],
      },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.OTHER_SCHEME,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.OTHER_SCHEME, CALL_NUMBER_TYPE_NAMES.UDC],
      },
      {
        name: BROWSE_CALL_NUMBER_OPTIONS.SUPERINTENDENT_OF_DOCUMENTS,
        callNumberTypes: [CALL_NUMBER_TYPE_NAMES.SUDOC],
      },
    ];
    // eslint-disable-next-line func-names
    callNumberTypesSettings.getAssignedCallNumberTypes = function (name) {
      return this.find((item) => item.name === name).callNumberTypes;
    };
    const generateInstances = () => {
      return Array(callNumbers.length)
        .fill({})
        .map((_, i) => {
          return InventoryInstances.generateFolioInstances({
            instanceTitlePrefix: `${instancePrefix}_${i}`,
            itemsProperties: {
              itemLevelCallNumber: callNumbers[i].value,
              itemLevelCallNumberTypeId: getIdByName(callNumbers[i].type),
            },
          });
        })
        .flat();
    };

    let folioInstances = null;

    before('Create test data', () => {
      cy.getAdminToken()
        .then(() => {
          InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411749');
          CallNumberTypes.deleteCallNumberTypesLike('AT_C411749').then(() => {
            CallNumberTypes.createCallNumberTypeViaApi({
              name: localCallNumberTypeName,
            }).then(() => {
              callNumberTypesSettings.forEach((setting) => {
                CallNumberBrowseSettings.assignCallNumberTypesViaApi(setting);
              });
              CallNumberTypes.getCallNumberTypesViaAPI().then((res) => {
                callNumberTypes = res;
              });
            });
          });
          const servicePoint = ServicePoints.getDefaultServicePointWithPickUpLocation();
          testData.defaultLocation = Location.getDefaultLocation(servicePoint.id);
          Location.createViaApi(testData.defaultLocation);
        })
        .then(() => {
          folioInstances = generateInstances();
          InventoryInstances.createFolioInstancesViaApi({
            folioInstances,
            location: testData.defaultLocation,
          });
        })
        .then(() => {
          cy.createTempUser([Permissions.inventoryAll.gui]).then((userProperties) => {
            testData.userId = userProperties.userId;
            cy.login(userProperties.username, userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventorySearchAndFilter.switchToBrowseTab();
            InventorySearchAndFilter.validateBrowseToggleIsSelected();
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      callNumberTypesSettings.forEach((setting) => {
        CallNumberBrowseSettings.assignCallNumberTypesViaApi({ ...setting, callNumberTypes: [] });
      });
      Users.deleteViaApi(testData.userId);
      InventoryInstances.deleteFullInstancesByTitleViaApi('AT_C411749');
      CallNumberTypes.deleteCallNumberTypesLike('AT_C411749');
      cy.wait(1000);
      Location.deleteInstitutionCampusLibraryLocationViaApi(
        testData.defaultLocation.institutionId,
        testData.defaultLocation.campusId,
        testData.defaultLocation.libraryId,
        testData.defaultLocation.id,
      );
    });

    it(
      'C411749 Correct counters in "Effective location (item)" accordion when browsing call numbers with different browse options selected (spitfire)',
      { tags: ['extendedPathFlaky', 'spitfire', 'nonParallel', 'C411749'] },
      () => {
        InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(
          BROWSE_CALL_NUMBER_OPTIONS.CALL_NUMBERS_ALL,
        );
        callNumbers.forEach((cn) => {
          BrowseCallNumber.waitForCallNumberToAppear(cn.value);
        });
        InventorySearchAndFilter.browseSearch('a');
        InventorySearchAndFilter.verifyAccordionByNameExpanded(locationAccordionName, false);
        InventorySearchAndFilter.verifyBrowseResultListExists();

        InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
        InventorySearchAndFilter.verifyMultiSelectFilterOptionCount(
          locationAccordionName,
          testData.defaultLocation.name,
          callNumbers.length,
        );

        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          testData.defaultLocation.name,
        );
        InventorySearchAndFilter.verifyNumberOfBrowseResults(callNumbers.length + 1);
        callNumbers.forEach((cn) => {
          BrowseCallNumber.checkValuePresentInResults(cn.value);
        });

        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          testData.defaultLocation.name,
        );
        InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
          locationAccordionName,
          testData.defaultLocation.name,
          false,
        );
        InventorySearchAndFilter.verifyBrowseResultListExists();

        InventorySearchAndFilter.browseSearch(callNumbers[2].value);
        BrowseCallNumber.valueInResultTableIsHighlighted(callNumbers[2].value);

        InventorySearchAndFilter.selectMultiSelectFilterOption(
          locationAccordionName,
          testData.defaultLocation.name,
        );
        InventorySearchAndFilter.verifyNumberOfBrowseResults(callNumbers.length);
        callNumbers.forEach((cn) => {
          BrowseCallNumber.checkValuePresentInResults(cn.value);
        });

        [callNumbers[1], callNumbers[0], ...callNumbers.slice(2)].forEach((cn) => {
          const browseOption = callNumberTypesSettings.filter((option) => option.callNumberTypes.includes(cn.type))[0];
          const expectedCallNumberTypes = callNumberTypesSettings.getAssignedCallNumberTypes(
            browseOption.name,
          );
          const expectedCallNumbers = callNumbers.filter((callNumber) => expectedCallNumberTypes.includes(callNumber.type));
          InventorySearchAndFilter.selectBrowseOptionFromCallNumbersGroup(browseOption.name);
          InventorySearchAndFilter.checkBrowseOptionSelected(browseOption.name);

          InventorySearchAndFilter.browseSearch(cn.value);
          InventorySearchAndFilter.verifyAccordionByNameExpanded(locationAccordionName, false);
          BrowseCallNumber.valueInResultTableIsHighlighted(cn.value);

          InventorySearchAndFilter.toggleAccordionByName(locationAccordionName);
          InventorySearchAndFilter.selectMultiSelectFilterOption(
            locationAccordionName,
            testData.defaultLocation.name,
          );
          InventorySearchAndFilter.verifyMultiSelectFilterOptionSelected(
            locationAccordionName,
            testData.defaultLocation.name,
          );
          InventorySearchAndFilter.verifyNumberOfBrowseResults(expectedCallNumbers.length);
          expectedCallNumbers.forEach((callNumber) => {
            BrowseCallNumber.checkValuePresentInResults(callNumber.value);
          });
        });
      },
    );
  });
});
