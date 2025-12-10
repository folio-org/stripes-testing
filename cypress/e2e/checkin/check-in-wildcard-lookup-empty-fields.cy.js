import { Permissions } from '../../support/dictionary';
import { ITEM_STATUS_NAMES, LOCATION_IDS } from '../../support/constants';
import InventoryInstances from '../../support/fragments/inventory/inventoryInstances';
import CheckInActions from '../../support/fragments/check-in-actions/checkInActions';
import ServicePoints from '../../support/fragments/settings/tenant/servicePoints/servicePoints';
import CheckInPane from '../../support/fragments/check-in-actions/checkInPane';
import SelectItemModal from '../../support/fragments/check-in-actions/selectItemModal';
import OtherSettings from '../../support/fragments/settings/circulation/otherSettings';
import UserEdit from '../../support/fragments/users/userEdit';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Check in', () => {
  let userData;
  let servicePoint;
  const testData = {};
  const randomPostfix = getRandomPostfix();
  const barcode1 = `11${randomPostfix}`;
  const barcode2 = `111${randomPostfix}`;
  const partialBarcode = '1';

  before('Creating test data', () => {
    cy.getAdminToken().then(() => {
      ServicePoints.getCircDesk1ServicePointViaApi().then((sp) => {
        servicePoint = sp;
      });
      cy.getInstanceTypes({ limit: 1 }).then((instanceTypes) => {
        testData.instanceTypeId = instanceTypes[0].id;
      });
      cy.getHoldingTypes({ limit: 1 }).then((res) => {
        testData.holdingTypeId = res[0].id;
      });
      cy.createLoanType({
        name: `loanType_${getRandomPostfix()}`,
      }).then((loanType) => {
        testData.loanTypeId = loanType.id;
      });
      cy.getDefaultMaterialType().then((res) => {
        testData.materialTypeId = res.id;
      });
    });

    cy.getAdminToken().then(() => {
      OtherSettings.setOtherSettingsViaApi({
        wildcardLookupEnabled: true,
      });

      testData.instanceTitle = `Instance_C688737_${getRandomPostfix()}`;

      InventoryInstances.createFolioInstanceViaApi({
        instance: {
          instanceTypeId: testData.instanceTypeId,
          title: testData.instanceTitle,
        },
        holdings: [
          {
            holdingsTypeId: testData.holdingTypeId,
            permanentLocationId: LOCATION_IDS.MAIN_LIBRARY,
          },
        ],
        items: [
          {
            barcode: barcode1,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
          {
            barcode: barcode2,
            status: { name: ITEM_STATUS_NAMES.AVAILABLE },
            permanentLoanType: { id: testData.loanTypeId },
            materialType: { id: testData.materialTypeId },
          },
        ],
      }).then((specialInstanceIds) => {
        testData.instanceId = specialInstanceIds.instanceId;
      });
    });

    cy.createTempUser([Permissions.checkinAll.gui]).then((userProperties) => {
      userData = userProperties;

      UserEdit.addServicePointViaApi(servicePoint.id, userProperties.userId, servicePoint.id);

      cy.login(userData.username, userData.password, {
        path: TopMenu.checkInPath,
        waiter: CheckInActions.waitLoading,
      });
    });
  });

  after('Deleting test data', () => {
    cy.getAdminToken();
    OtherSettings.setOtherSettingsViaApi({
      wildcardLookupEnabled: false,
    });
    InventoryInstances.deleteInstanceAndHoldingRecordAndAllItemsViaApi(barcode1);
    Users.deleteViaApi(userData.userId);
    cy.deleteLoanType(testData.loanTypeId);
  });

  it(
    'C688737 Check fields without any information on the "Check in" app (vega)',
    { tags: ['extendedPath', 'vega', 'C688737'] },
    () => {
      CheckInActions.fillInBarcode(partialBarcode);
      cy.wait(1000);
      cy.do(cy.get('#clickable-add-item').click());

      SelectItemModal.waitLoading();
      SelectItemModal.verifyModalTitle();
      SelectItemModal.verifyCallNumberColumn();
      SelectItemModal.verifyCallNumberValue(barcode1, '-');
      SelectItemModal.verifyCallNumberValue(barcode2, '-');

      SelectItemModal.chooseItem(barcode1);

      CheckInPane.checkResultsInTheRow([barcode1]);
      CheckInPane.checkResultsInTheRow(['No value set-']);
    },
  );
});
