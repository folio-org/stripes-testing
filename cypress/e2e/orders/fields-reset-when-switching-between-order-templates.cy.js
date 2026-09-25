import { including } from '../../../interactors';
import {
  CUSTOM_FIELD_ENTITY_TYPES,
  ORDER_TYPES,
  ORDER_VIEW_FIELD_LABELS,
} from '../../support/constants';
import { Permissions } from '../../support/dictionary';
import { OrderDetails, Orders } from '../../support/fragments/orders';
import OrderEditForm from '../../support/fragments/orders/orderEditForm';
import { NewOrganization, Organizations } from '../../support/fragments/organizations';
import AcquisitionUnits from '../../support/fragments/settings/acquisitionUnits/acquisitionUnits';
import { OrderTemplates, SettingsOrders } from '../../support/fragments/settings/orders';
import { Addresses } from '../../support/fragments/settings/tenant/general';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import InteractorsTools from '../../support/utils/interactorsTools';
import {
  generateSingleSelectCustomFieldData,
  generateTextAreaCustomFieldData,
} from '../../support/utils/customFields';
import getRandomPostfix, { randomFourDigitNumber } from '../../support/utils/stringTools';

describe('Orders', () => {
  const RENEWAL_INTERVAL = '30';
  const RENEWAL_DATE_API = '2027-01-15';
  const RENEWAL_DATE_UI = '01/15/2027';
  const SINGLE_SELECT_OPTION = { id: 'opt_0', value: 'Value A' };
  let testData;

  const checkOrderFormIsBlank = ({ reEncumber = true } = {}) => {
    OrderEditForm.verifyOrderInformationSection([
      { label: 'poNumberPrefix', conditions: { value: '' } },
      { label: 'poNumberSuffix', conditions: { value: '' } },
      { label: 'vendor', conditions: { value: '' } },
      { label: 'assignedTo', conditions: { value: '' } },
      { label: 'billTo', conditions: { singleValue: '' } },
      { label: 'shipTo', conditions: { singleValue: '' } },
      { label: 'orderType', conditions: { value: '' } },
      { label: 'acquisitionUnit', conditions: { selectedCount: 0 } },
      { label: 'manualPo', conditions: { checked: false } },
      { label: 'reEncumber', conditions: { checked: reEncumber } },
    ]);
    OrderEditForm.verifyOngoingOrderInformationSectionAbsent();
    OrderEditForm.checkCustomFieldsSection([
      { type: 'select', label: testData.customFields.singleSelect.name, conditions: { value: '' } },
      { type: 'textArea', label: testData.customFields.textArea.name, conditions: { value: '' } },
    ]);
  };

  const checkOrderFormFilledFromTemplate = () => {
    OrderEditForm.verifyOrderInformationSection([
      { label: 'poNumberPrefix', conditions: { value: testData.prefix.name } },
      { label: 'poNumberSuffix', conditions: { value: testData.suffix.name } },
      { label: 'vendor', conditions: { value: including(testData.organization.name) } },
      { label: 'assignedTo', conditions: { value: including(testData.user.lastName) } },
      { label: 'billTo', conditions: { singleValue: testData.address.name } },
      { label: 'shipTo', conditions: { singleValue: testData.address.name } },
      { label: 'orderType', conditions: { value: ORDER_TYPES.ONGOING } },
      { label: 'acquisitionUnit', conditions: { selected: [testData.acquisitionUnit.name] } },
      { label: 'manualPo', conditions: { checked: true } },
      { label: 'reEncumber', conditions: { checked: true } },
    ]);
    OrderEditForm.checkOngoingOrderInformationSection([
      { label: 'subscription', conditions: { checked: true } },
      { label: 'renewalInterval', conditions: { value: RENEWAL_INTERVAL } },
      { label: 'renewalDate', conditions: { value: RENEWAL_DATE_UI } },
      { label: 'manualRenewal', conditions: { checked: true } },
      { label: 'notes', conditions: { value: testData.ongoingNotes } },
    ]);
    OrderEditForm.checkCustomFieldsSection([
      {
        type: 'select',
        label: testData.customFields.singleSelect.name,
        conditions: { checkedOptionText: SINGLE_SELECT_OPTION.value },
      },
      {
        type: 'textArea',
        label: testData.customFields.textArea.name,
        conditions: { value: testData.customFields.textArea.testValue },
      },
    ]);
  };

  before('Create test data', () => {
    testData = {
      organization: NewOrganization.getDefaultOrganization(),
      acquisitionUnit: AcquisitionUnits.getDefaultAcquisitionUnit({ protectRead: false }),
      address: Addresses.generateAddressConfig(),
      prefix: { name: `AT${randomFourDigitNumber()}` },
      suffix: { name: `AT${randomFourDigitNumber()}` },
      ongoingNotes: `AT_C805754_notes_${getRandomPostfix()}`,
      customFields: {
        singleSelect: {
          ...generateSingleSelectCustomFieldData({
            testNumber: 'C805754',
            data: {
              entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER,
              selectField: {
                multiSelect: false,
                options: {
                  values: [
                    { ...SINGLE_SELECT_OPTION, default: false },
                    { id: 'opt_1', value: 'Value B', default: false },
                  ],
                },
              },
            },
          }),
          name: `AT_C805754_SS_${randomFourDigitNumber()}`,
        },
        textArea: {
          ...generateTextAreaCustomFieldData({
            testNumber: 'C805754',
            data: { entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER },
          }),
          name: `AT_C805754_TA_${randomFourDigitNumber()}`,
          testValue: `AT_C805754_text_area_${getRandomPostfix()}`,
        },
      },
      templateWithFields: OrderTemplates.getDefaultOrderTemplate({}),
      templateWithName: OrderTemplates.getDefaultOrderTemplate({}),
    };

    cy.clearLocalStorage();
    cy.getAdminToken();
    Organizations.createOrganizationViaApi(testData.organization).then((organizationId) => {
      testData.organization.id = organizationId;
    });
    Addresses.createAddressViaApi(testData.address);
    SettingsOrders.createPrefixViaApi(testData.prefix.name).then((prefixId) => {
      testData.prefix.id = prefixId;
    });
    SettingsOrders.createSuffixViaApi(testData.suffix.name).then((suffixId) => {
      testData.suffix.id = suffixId;
    });

    // Precondition 2: Two custom PO fields ("Single select" and "Text area")
    const customFieldsArray = Object.values(testData.customFields).map(
      // eslint-disable-next-line no-unused-vars
      ({ testValue, ...fieldData }) => fieldData,
    );
    cy.createCustomFieldsViaApi(customFieldsArray, CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER).then(
      (createdFields) => {
        createdFields.forEach((field) => {
          const key = Object.keys(testData.customFields).find(
            (k) => testData.customFields[k].name === field.name,
          );

          testData.customFields[key] = { ...testData.customFields[key], ...field };
        });
      },
    );

    // Precondition 5: User with required permissions
    cy.createTempUser([
      Permissions.uiOrdersCreate.gui,
      Permissions.uiOrdersAssignAcquisitionUnitsToNewOrder.gui,
    ]).then((userProperties) => {
      testData.user = userProperties;

      // Precondition 1: Acquisition unit with "View" unchecked, admin and test user are members
      AcquisitionUnits.createAcquisitionUnitViaApi(testData.acquisitionUnit);
      cy.getAdminUserDetails().then((admin) => {
        AcquisitionUnits.assignUserViaApi(admin.id, testData.acquisitionUnit.id);
      });
      AcquisitionUnits.assignUserViaApi(testData.user.userId, testData.acquisitionUnit.id);

      // Precondition 3: Order template #1 with all fields filled in
      cy.then(() => {
        OrderTemplates.createOrderTemplateViaApi({
          ...testData.templateWithFields,
          poNumberPrefix: testData.prefix.name,
          poNumberSuffix: testData.suffix.name,
          vendor: testData.organization.id,
          assignedTo: testData.user.userId,
          billTo: testData.address.id,
          shipTo: testData.address.id,
          orderType: ORDER_TYPES.ONGOING,
          acqUnitIds: [testData.acquisitionUnit.id],
          manualPo: true,
          reEncumber: true,
          ongoing: {
            isSubscription: true,
            interval: Number(RENEWAL_INTERVAL),
            renewalDate: RENEWAL_DATE_API,
            manualRenewal: true,
            notes: testData.ongoingNotes,
          },
          customFields: {
            [testData.customFields.singleSelect.refId]: SINGLE_SELECT_OPTION.id,
            [testData.customFields.textArea.refId]: testData.customFields.textArea.testValue,
          },
        });
      });

      // Precondition 4: Order template #2 with only "Template name" filled in
      OrderTemplates.createOrderTemplateViaApi(testData.templateWithName);

      // Precondition 6: User is on the "Orders" app, "Orders" toggle is selected
      cy.login(userProperties.username, userProperties.password, {
        path: TopMenu.ordersPath,
        waiter: Orders.waitLoading,
      });
    });
  });

  after('Delete test data', () => {
    cy.getAdminToken();
    Orders.getOrdersApi({ query: `vendor=="${testData.organization.id}"` }).then((orders) => {
      orders.forEach((order) => Orders.deleteOrderViaApi(order.id, false));
    });
    OrderTemplates.deleteOrderTemplateViaApi(testData.templateWithFields.id);
    OrderTemplates.deleteOrderTemplateViaApi(testData.templateWithName.id);
    cy.deleteCustomFieldsViaApi({
      ids: Object.values(testData.customFields).map(({ id }) => id),
      entityType: CUSTOM_FIELD_ENTITY_TYPES.PURCHASE_ORDER,
    });
    SettingsOrders.deletePrefixViaApi(testData.prefix.id);
    SettingsOrders.deleteSuffixViaApi(testData.suffix.id);
    Addresses.deleteAddressViaApi(testData.address);
    Organizations.deleteOrganizationViaApi(testData.organization.id);
    AcquisitionUnits.deleteAcquisitionUnitViaApi(testData.acquisitionUnit.id, false);
    Users.deleteViaApi(testData.user.userId);
  });

  it(
    'C805754 Fields are reset when switching between order templates (thunderjet)',
    { tags: ['criticalPath', 'thunderjet', 'C805754'] },
    () => {
      // Step 1: Click "Actions" button on the "Orders" pane and select "New" option
      Orders.clickCreateNewOrder();
      checkOrderFormIsBlank();

      // Step 2: Select Template #1 in the "Template name" dropdown
      OrderEditForm.selectOrderTemplate(testData.templateWithFields.templateName);
      OrderEditForm.verifySelectedOrderTemplate(testData.templateWithFields.templateName);
      checkOrderFormFilledFromTemplate();

      // Step 3: Select Template #2 in the "Template name" dropdown
      OrderEditForm.selectOrderTemplate(testData.templateWithName.templateName);
      OrderEditForm.verifySelectedOrderTemplate(testData.templateWithName.templateName);
      checkOrderFormIsBlank({ reEncumber: false });

      // Step 4: Select "Ongoing" option in the "Order type" dropdown
      OrderEditForm.fillOrderInfoSectionFields({ orderType: ORDER_TYPES.ONGOING });
      OrderEditForm.checkOngoingOrderInformationSection([
        { label: 'subscription', conditions: { checked: false } },
        { label: 'renewalInterval', conditions: { value: '', readOnly: true } },
        { label: 'renewalDate', conditions: { value: '', readOnly: true } },
        { label: 'reviewPeriod', conditions: { value: '', readOnly: true } },
        { label: 'manualRenewal', conditions: { checked: false, readOnly: true } },
        { label: 'reviewDate', conditions: { value: '' } },
        { label: 'notes', conditions: { value: '' } },
      ]);

      // Step 5: Select blank option in the "Template name" dropdown
      OrderEditForm.selectBlankOrderTemplate();
      checkOrderFormIsBlank({ reEncumber: false });

      // Step 6: Select Template #1 in the "Template name" dropdown and click "Save & close"
      OrderEditForm.selectOrderTemplate(testData.templateWithFields.templateName);
      checkOrderFormFilledFromTemplate();
      OrderEditForm.clickSaveButton({ orderSaved: false });
      OrderDetails.waitLoading();
      InteractorsTools.checkCalloutContainsMessage(`The Purchase order - ${testData.prefix.name}`);
      InteractorsTools.checkCalloutContainsMessage(
        `${testData.suffix.name} has been successfully saved`,
      );
      OrderDetails.checkOrderDetails({
        orderInformation: [
          { key: ORDER_VIEW_FIELD_LABELS.PO_NUMBER, value: testData.prefix.name },
          { key: ORDER_VIEW_FIELD_LABELS.PO_NUMBER, value: testData.suffix.name },
          { key: ORDER_VIEW_FIELD_LABELS.VENDOR, value: testData.organization.name },
          { key: ORDER_VIEW_FIELD_LABELS.ORDER_TYPE, value: ORDER_TYPES.ONGOING },
          { key: ORDER_VIEW_FIELD_LABELS.ASSIGNED_TO, value: testData.user.lastName },
          { key: ORDER_VIEW_FIELD_LABELS.BILL_TO, value: testData.address.address },
          { key: ORDER_VIEW_FIELD_LABELS.SHIP_TO, value: testData.address.address },
          { key: ORDER_VIEW_FIELD_LABELS.ACQUISITION_UNITS, value: testData.acquisitionUnit.name },
          {
            key: ORDER_VIEW_FIELD_LABELS.MANUAL,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
          {
            key: ORDER_VIEW_FIELD_LABELS.RE_ENCUMBER,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
        ],
        ongoingInformation: [
          {
            key: ORDER_VIEW_FIELD_LABELS.SUBSCRIPTION,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
          { key: ORDER_VIEW_FIELD_LABELS.RENEWAL_INTERVAL, value: RENEWAL_INTERVAL },
          { key: ORDER_VIEW_FIELD_LABELS.RENEWAL_DATE, value: RENEWAL_DATE_UI },
          {
            key: ORDER_VIEW_FIELD_LABELS.MANUAL_RENEWAL,
            value: { checked: true, disabled: true },
            checkbox: true,
          },
          { key: ORDER_VIEW_FIELD_LABELS.NOTES, value: testData.ongoingNotes },
        ],
      });
      OrderDetails.verifyValuesInCustomFieldsAccordion(
        testData.customFields.singleSelect.name,
        SINGLE_SELECT_OPTION.value,
      );
      OrderDetails.verifyValuesInCustomFieldsAccordion(
        testData.customFields.textArea.name,
        testData.customFields.textArea.testValue,
      );
    },
  );
});
