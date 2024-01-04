import { FOLIO_RECORD_TYPE, ORDER_STATUSES } from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';
import { Permissions } from '../../../support/dictionary';
import MaterialTypes from '../../../support/fragments/settings/inventory/materialTypes';
import Locations from '../../../support/fragments/settings/tenant/location-setup/locations';
import ServicePoints from '../../../support/fragments/settings/tenant/servicePoints/servicePoints';
import Location from '../../../support/fragments/settings/tenant/locations/newLocation';

describe('data-import', () => {
  describe('Settings', () => {
    const testData = {
      servicePoint: ServicePoints.getDefaultServicePointWithPickUpLocation(),
    };
    const fields = {
      purchaseOrderStatus: { accordion: 'Order information', fieldName: 'Purchase order status*' },
      materialTypePhysical: { accordion: 'Physical resource details', fieldName: 'Material type' },
      materialTypeElectronic: { accordion: 'E-resources details', fieldName: 'Material type' },
      locationName: { accordion: 'Location', fieldName: 'Name (code)' },
      locationQuantityPhysical: { accordion: 'Location', fieldName: 'Quantity physical' },
      locationQuantityElectronic: { accordion: 'Location', fieldName: 'Quantity electronic' },
    };
    const mappingProfile = {
      name: `C367955testMappingProfile.${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      pendingOrderStatus: ORDER_STATUSES.PENDING,
      openOrderStatus: ORDER_STATUSES.OPEN,
      locationQuantityElectronic: '"1"',
      locationQuantityPhysical: '"1"',
      incomingRecordType: 'MARC_BIBLIOGRAPHIC',
      recordType: 'ORDER',
      description: '',
    };

    before('Create test data', () => {
      cy.getAdminToken().then(() => {
        ServicePoints.createViaApi(testData.servicePoint);
        testData.defaultLocation = Location.getDefaultLocation(testData.servicePoint.id);
        Location.createViaApi(testData.defaultLocation).then((createdLocation) => {
          mappingProfile.locationName = `"${createdLocation.name} (${createdLocation.code})"`;
        });
        MaterialTypes.createMaterialTypeViaApi(MaterialTypes.getDefaultMaterialType()).then(
          (createdType) => {
            mappingProfile.materialTypeName = `"${createdType.body.name}"`;
            testData.materialTypeId = createdType.body.id;
          },
        );
      });
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        testData.user = userProperties;
        cy.login(testData.user.username, testData.user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
      Locations.deleteViaApi(testData.defaultLocation);
      ServicePoints.deleteViaApi(testData.servicePoint.id);
      MaterialTypes.deleteMaterialTypeViaApi(testData.materialTypeId);
    });

    it(
      'C380542 Order field mapping profile: Verify that Material type fields is inactive after switching from pending to open status in the create page (folijet) (TaaS)',
      { tags: ['extendedPath', 'folijet'] },
      () => {
        // #1 Select "Field mapping profiles" -> Click "Actions" button -> Select "New field mapping profile" option
        FieldMappingProfiles.openNewMappingProfileForm();

        // #2 Populate the following fields:
        NewFieldMappingProfile.fillSummaryInMappingProfile(mappingProfile);
        NewFieldMappingProfile.checkPreviouslyPopulatedDataIsDisplayed(mappingProfile);
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfile.pendingOrderStatus);
        NewFieldMappingProfile.verifyFieldValue(
          fields.purchaseOrderStatus.accordion,
          fields.purchaseOrderStatus.fieldName,
          `"${mappingProfile.pendingOrderStatus}"`,
        );

        // #3 Navigate to the "Material type" field in the "Physical resource details" accordion -> select any value from the dropdown list
        NewFieldMappingProfile.fillMaterialTypeForPhysicalResource(mappingProfile.materialTypeName);
        NewFieldMappingProfile.verifyFieldValue(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
          mappingProfile.materialTypeName,
        );

        // #4 Navigate to the "Material type" field in the "E-resources details" accordion -> select any value from the dropdown list
        NewFieldMappingProfile.fillMaterialTypeForElectronicResource(
          mappingProfile.materialTypeName,
        );
        NewFieldMappingProfile.verifyFieldValue(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
          mappingProfile.materialTypeName,
        );

        // #5 Navigate to the "Location" accordion -> Click "Add location" button and populate following  fields:
        NewFieldMappingProfile.addLocation(mappingProfile);
        NewFieldMappingProfile.verifyFieldValue(
          fields.locationName.accordion,
          fields.locationName.fieldName,
          mappingProfile.locationName,
        );
        NewFieldMappingProfile.verifyFieldValue(
          fields.locationQuantityPhysical.accordion,
          fields.locationQuantityPhysical.fieldName,
          mappingProfile.locationQuantityPhysical,
        );
        NewFieldMappingProfile.verifyFieldValue(
          fields.locationQuantityElectronic.accordion,
          fields.locationQuantityElectronic.fieldName,
          mappingProfile.locationQuantityElectronic,
        );

        // #6 Return to the "Purchase order status" in the "Order information" accordion: select **"Open"** option
        NewFieldMappingProfile.fillPurchaseOrderStatus(mappingProfile.openOrderStatus);
        NewFieldMappingProfile.verifyFieldValue(
          fields.purchaseOrderStatus.accordion,
          fields.purchaseOrderStatus.fieldName,
          `"${mappingProfile.openOrderStatus}"`,
        );
        // #7 Navigate to the "Material type" field in the "Physical resource details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
        );
        // * "Material type" info icon is clickable
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.materialTypePhysical.accordion,
          fields.materialTypePhysical.fieldName,
        );
        // #8 Navigate to the "Material type" field in the "E-resources details" accordion
        NewFieldMappingProfile.verifyFieldEmptyAndDisabled(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
        );
        NewFieldMappingProfile.verifyInfoIconClickable(
          fields.materialTypeElectronic.accordion,
          fields.materialTypeElectronic.fieldName,
        );
        // #9 Navigate to the "Location" accordion
        NewFieldMappingProfile.verifyAddLocationButtonEnabled();
      },
    );
  });
});
