/* eslint-disable cypress/no-unnecessary-waiting */
import { including, Link } from '@interactors/html';
import getRandomPostfix from '../../utils/stringTools';
import {
  Accordion,
  Button,
  KeyValue,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Section,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextField
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import NewJobProfile from './job_profiles/newJobProfile';
import DateTools from '../../utils/dateTools';

const itemBarcode = 'xyzt124245271818912626262';
const poLineData = {
  title: 'Agrarianism and capitalism in early Georgia, 1732-1743 / Jay Jordan Butler.',
  productId: `xyz${getRandomPostfix()}`,
  productIdType: 'ISSN',
  acquisitionMethod: 'Purchase at vendor system',
  orderFormat: 'Physical resource',
  vrn: '14567-1',
  vrnType: 'Vendor order reference number',
  physicalUnitPrice: '20',
  physicalUnitQuantity: '1',
  locationName: 'Main Library (KU/CC/DI/M)',
  quantityPhysical: '1',
  materialType: 'book',
};

const actionButton = Button('Actions');
const deleteButton = Button('Delete');
const closeButton = Button({ icon: 'times' });
const poTitleField = TextField({ name: 'titleOrPackage' });
const addProductIdButton = Button('Add product ID and product ID type');
const productIdField = TextField('Product ID*');
const productIdSelect = Select('Product ID type*');
const acquisitionMethodButton = Button({ id: 'acquisition-method' });
const acquisitionMethodOption = SelectionOption(poLineData.acquisitionMethod);
const orderFormatSelect = Select({ name: 'orderFormat' });
const addVRNButton = Button('Add vendor reference number');
const vrnField = TextField('Vendor reference number*');
const vrnType = Select('Vendor reference type*');
const physicalUnitPriceField = TextField('Physical unit price*');
const physicalQuantityField = TextField('Quantity physical*');
const materialTypeSelect = Select('Material type*');
const addLocationButton = Button('Add location');
const locationNameSelection = Selection('Name (code)*');
const locationNameOption = SelectionOption(poLineData.locationName);
const locationQuantityPhysicalField = TextField({ name: 'locations[0].quantityPhysical' });
const poLineSaveButton = Button('Save & close');
const goBackPurchaseOrderButton = Button({ id: 'clickable-backToPO' });
const orderDetailsPane = PaneHeader({ id: 'paneHeaderorder-details' });
const orderLinesDetailsSection = Section({ id: 'order-lines-details' });
const openOrderButton = Button('Open');
const openOrderModal = Modal({ content: including('Open - purchase order') });
const submitButton = Button('Submit');
const workflowStatusKeyValue = KeyValue('Workflow status');
const newMappingProfileButton = Button('New field mapping profile');
const saveProfileButton = Button('Save as profile & Close');
const folioRecordTypeSelect = Select('FOLIO record type*');
const nameField = TextField('Name*');
const incomingRecordTypeSelect = Select('Incoming record type*');
const catalogedDateField = TextField('Cataloged date');
const instanceStatusTermField = TextField('Instance status term');
const permanentLocationField = TextField('Permanent');
const callNumberField = TextField('Call number');
const holdingsTypeField = TextField('Holdings type');
const callNumberTypeField = TextField('Call number type');
const barcodeField = TextField('Barcode');
const copyNumberField = TextField('Copy number');
const statusField = TextField('Status');
const actionProfilesPaneHeader = PaneHeader('Action profiles');
const newActionProfileButton = Button('New action profile');
const actionSelect = Select('Action*');
const linkProfileButton = Button('Link Profile');
const selectMappingProfilesModal = Modal('Select Field Mapping Profiles');
const queryField = TextField({ name: 'query' });
const searchButton = Button('Search');
const matchProfilesPaneHeader = PaneHeader('Match profiles');
const newMatchProfileButton = Button('New match profile');
const incomingField = TextField('Field');
const indicatorField1 = TextField('In. 1');
const indicatorField2 = TextField('In. 2');
const incomingSubField = TextField('Subfield');
const criterionValueButton = Button({ id: 'criterion-value-type' });
const criterionSelection = SelectionList({ id: 'sl-container-criterion-value-type' });
const jobProfilesPaneHeader = PaneHeader('Job profiles');
const newJobProfileButton = Button('New job profile');
const dataTypeSelect = Select('Accepted data type*');
const searchResultsList = MultiColumnList({ id: 'search-results-list' });
const instanceStatusTermKeyValue = KeyValue('Instance status term');
const sourceKeyValue = KeyValue('Source');
const catalogedDateKeyValue = KeyValue('Cataloged date');
const viewHoldingsButton = Button('View holdings');
const holdingsTypeKeyValue = KeyValue('Holdings type');
const callNumberTypeKeyValue = KeyValue('Call number type');
const permanentLocationKeyValue = KeyValue('Permanent');
const holdingsAccordionButton = Button(including('Holdings: Main Library'));
const itemStatusKeyValue = KeyValue('Item status');
const itemBarcodeKeyValue = KeyValue('Item barcode');
const instanceDetailsSection = Section({ id: 'pane-instancedetails' });
const viewSourceButton = Button('View source');
const holdingsDetailsSection = Section({ id: 'ui-inventory.holdingsRecordView' });
const itemPaneHeader = PaneHeader(including('Item'));
const instanceAcquisitionsList = MultiColumnList({ id: 'list-instance-acquisitions' });
const itemBarcodeLink = Link(itemBarcode);
const orderDetailsAccordion = Accordion({ id: 'purchaseOrder' });

function verifyCreatedOrder(order) {
  cy.expect(Pane({ id: 'order-details' }).exists());
  cy.expect(orderDetailsAccordion.find(KeyValue({ value: order.vendor })).exists());
}

function fillPOLineInfo() {
  cy.do([
    poTitleField.fillIn(poLineData.title),
    addProductIdButton.click(),
    productIdField.fillIn(poLineData.productId),
    productIdSelect.choose(poLineData.productIdType),
    acquisitionMethodButton.click(),
    acquisitionMethodOption.click(),
    orderFormatSelect.choose(poLineData.orderFormat),
    addVRNButton.click(),
    vrnField.fillIn(poLineData.vrn),
    vrnType.choose(poLineData.vrnType),
    physicalUnitPriceField.fillIn(poLineData.physicalUnitPrice),
    physicalQuantityField.fillIn(poLineData.physicalUnitQuantity),
    materialTypeSelect.choose(poLineData.materialType),
    addLocationButton.click(),
    locationNameSelection.open(),
    locationNameOption.click(),
    locationQuantityPhysicalField.fillIn(poLineData.quantityPhysical),
    poLineSaveButton.click(),
  ]);
}

function goBackToPO() {
  cy.do(goBackPurchaseOrderButton.click());
}

function openOrder() {
  cy.do([
    orderDetailsPane.find(actionButton).click(),
    openOrderButton.click(),
    openOrderModal.find(submitButton).click()
  ]);
}

function verifyOrderStatus() {
  cy.expect(workflowStatusKeyValue.has({ value: 'Open' }));
}

function openMappingProfileForm() {
  cy.do([
    actionButton.click(),
    newMappingProfileButton.click(),
  ]);
}

function saveProfile() {
  cy.do(saveProfileButton.click());
}

const closeViewModeForMappingProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(closeButton).click());
};

function creatMappingProfilesForInstance(name) {
  cy.intercept('GET', '/instance-statuses?*').as('getInstanceStatuses');
  openMappingProfileForm();
  return cy.do(folioRecordTypeSelect.choose('Instance'))
    .then(() => {
      cy.wait('@getInstanceStatuses');
      // needs some waiting until selection lists are populated
      cy.wait(1200);
    })
    .then(() => {
      cy.do([
        nameField.fillIn(name),
        incomingRecordTypeSelect.choose('MARC Bibliographic'),
        catalogedDateField.fillIn('###TODAY###'),
        instanceStatusTermField.fillIn('"Batch Loaded"'),
      ]);
      saveProfile();
      closeViewModeForMappingProfile(name);
    });
}

function creatMappingProfilesForHoldings(name) {
  cy.intercept('GET', '/holdings-types?*').as('getHoldingsTypes');
  cy.intercept('GET', '/call-number-types?*').as('getCallNumberTypes');
  openMappingProfileForm();
  return cy.do(folioRecordTypeSelect.choose('Holdings'))
    .then(() => {
      cy.wait(['@getHoldingsTypes', '@getCallNumberTypes']);
      // needs some waiting until selection lists are populated
      cy.wait(1200);
    })
    .then(() => {
      cy.do([
        nameField.fillIn(name),
        incomingRecordTypeSelect.choose('MARC Bibliographic'),
        permanentLocationField.fillIn('980$a'),
        callNumberField.fillIn('980$b " " 980$c'),
        holdingsTypeField.fillIn('"Monograph"'),
        callNumberTypeField.fillIn('"Library of Congress classification"'),
      ]);
      saveProfile();
      closeViewModeForMappingProfile(name);
    });
}

function creatMappingProfilesForItem(name) {
  openMappingProfileForm();
  cy.do([
    folioRecordTypeSelect.choose('Item'),
    nameField.fillIn(name),
    incomingRecordTypeSelect.choose('MARC Bibliographic'),
    barcodeField.fillIn('981$b'),
    copyNumberField.fillIn('981$a'),
    statusField.fillIn('"Available"'),
  ]);
  saveProfile();
  closeViewModeForMappingProfile(name);
}

function closeDetailView() {
  cy.do(closeButton.click());
}

function createActionProfileForVRN(name, recordType, mappingProfile, action) {
  cy.expect(actionProfilesPaneHeader.exists());
  cy.do([
    actionProfilesPaneHeader.find(actionButton).click(),
    newActionProfileButton.click(),
    nameField.fillIn(name),
    actionSelect.choose(action || 'Update (all record types except Orders)'),
    folioRecordTypeSelect.choose(recordType),
    linkProfileButton.click(),
    selectMappingProfilesModal.find(queryField).fillIn(mappingProfile),
    searchButton.click(),
    MultiColumnListCell(mappingProfile).click(),
  ]);
  cy.expect(linkProfileButton.has({ disabled: true }));

  cy.do(saveProfileButton.click());
  closeDetailView();
}

function waitJSONSchemasLoad() {
  cy.intercept(
    'GET',
    '/_/jsonSchemas?path=acq-models/mod-orders-storage/schemas/vendor_detail.json',
  ).as('getVendorDetailJson');
  cy.intercept(
    'GET',
    '/_/jsonSchemas?path=raml-util/schemas/metadata.schema',
  ).as('metadata');
  cy.wait(['@getVendorDetailJson', '@metadata'], getLongDelay());
  // needs some waiting until existing record list is populated
  cy.wait(1500);
}

function createMatchProfileForVRN({
  name,
  existingRecordType,
  field = '024',
  in1 = '8',
  in2 = '*',
  subfield = 'a'
}) {
  cy.do([
    matchProfilesPaneHeader.find(actionButton).click(),
    newMatchProfileButton.click(),
    nameField.fillIn(name),
  ]);

  cy.get(`[data-id="${existingRecordType}"]`).last().click();
  cy.do([
    incomingField.fillIn(field),
    indicatorField1.fillIn(in1),
    indicatorField2.fillIn(in2),
    incomingSubField.fillIn(subfield),
    criterionValueButton.click(),
  ]);
  cy.expect(criterionSelection.exists());
  cy.do(criterionSelection.select('Acquisitions data: Vendor reference number'));

  saveProfile();
  cy.intercept('POST', '/data-import-profiles/matchProfiles').as('createMatchProfile');
  cy.wait('@createMatchProfile');
  cy.expect(PaneHeader(name).exists());
  closeDetailView();
}

function createJobProfileForVRN({ name, dataType, matches }) {
  cy.expect(jobProfilesPaneHeader.exists());
  cy.do([
    jobProfilesPaneHeader.find(actionButton).click(),
    newJobProfileButton.click(),
    nameField.fillIn(name),
    dataTypeSelect.choose(dataType),
  ]);

  matches.forEach((match, i) => {
    NewJobProfile.linkMatchAndActionProfiles(match.matchName, match.actionName, 2 * i);
  });
  saveProfile();
}

function clickOnUpdatedHotlink(columnIndex = 3, row = 0) {
  cy.intercept('GET', '/metadata-provider/jobLogEntries/*').as('getLogEntries');
  cy.wait('@getLogEntries', getLongDelay());
  cy.do(searchResultsList.find(MultiColumnListCell({
    row,
    columnIndex,
  })).find(Link('Updated')).click());
}

function verifyInstanceUpdated() {
  cy.expect(instanceStatusTermKeyValue.has({ value: 'Batch Loaded' }));
  cy.expect(sourceKeyValue.has({ value: 'MARC' }));
  cy.expect(catalogedDateKeyValue.has({ value: DateTools.getFormattedDate({ date: new Date() }) }));
}

function verifyHoldingsUpdated() {
  cy.do(viewHoldingsButton.click());
  cy.expect(holdingsTypeKeyValue.has({ value: 'Monograph' }));
  cy.expect(callNumberTypeKeyValue.has({ value: 'Library of Congress classification' }));
  cy.expect(permanentLocationKeyValue.has({ value: 'Main Library' }));
  closeDetailView();
}


function verifyItemUpdated() {
  cy.do([
    holdingsAccordionButton.click(),
    itemBarcodeLink.click(),
  ]);
  cy.expect(itemStatusKeyValue.has({ value: 'Available' }));
  cy.expect(itemBarcodeKeyValue.has({ value: itemBarcode }));

  closeDetailView();
}

function openMARCBibSource() {
  cy.do([
    instanceDetailsSection.find(actionButton).click(),
    viewSourceButton.click(),
  ]);
  closeDetailView();
}

function deleteHoldings() {
  cy.do([
    viewHoldingsButton.click(),
    holdingsDetailsSection.find(actionButton).click(),
    deleteButton.click(),
    Modal().find(deleteButton).click(),
  ]);
}

function deleteItem() {
  cy.intercept('GET', '/inventory/items/*').as('deleteItem');
  cy.do([
    holdingsAccordionButton.click(),
    itemBarcodeLink.click(),
    itemPaneHeader.find(actionButton).click(),
    deleteButton.click(),
    Modal().find(deleteButton).click(),
  ]);
  cy.wait('@deleteItem');
}


function deletePOLine() {
  cy.do([
    instanceAcquisitionsList.find(Link(including('1'))).click(),
    orderLinesDetailsSection.find(actionButton).click(),
    deleteButton.click(),
    Modal().find(deleteButton).click(),
  ]);
}

export default {
  poLineData,
  verifyCreatedOrder,
  fillPOLineInfo,
  goBackToPO,
  openOrder,
  verifyOrderStatus,
  creatMappingProfilesForInstance,
  creatMappingProfilesForHoldings,
  creatMappingProfilesForItem,
  createActionProfileForVRN,
  createMatchProfileForVRN,
  waitJSONSchemasLoad,
  createJobProfileForVRN,
  clickOnUpdatedHotlink,
  verifyInstanceUpdated,
  verifyHoldingsUpdated,
  verifyItemUpdated,
  openMARCBibSource,
  deleteItem,
  deleteHoldings,
  deletePOLine,
};
