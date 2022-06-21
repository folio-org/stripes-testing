/* eslint-disable cypress/no-unnecessary-waiting */
import { including, Link } from '@interactors/html';
import getRandomPostfix from '../../utils/stringTools';
import {
  Button,
  KeyValue,
  Modal,
  MultiColumnListCell,
  Pane,
  PaneHeader,
  Select,
  Selection,
  SelectionList,
  SelectionOption,
  TextField
} from '../../../../interactors';
import { getLongDelay } from '../../utils/cypressTools';
import NewJobProfile from './job_profiles/newJobProfile';

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
  locationName: 'Online (E)',
  quantityPhysical: '1',
  materialType: 'book',
};

function fillPOLineInfo() {
  cy.do([
    TextField({ name: 'titleOrPackage' }).fillIn(poLineData.title),
    Button('Add product ID and product ID type').click(),
    TextField('Product ID*').fillIn(poLineData.productId),
    Select('Product ID type*').choose(poLineData.productIdType),
    Button({ id: 'acquisition-method' }).click(),
    SelectionOption(poLineData.acquisitionMethod).click(),
    Select({ name: 'orderFormat' }).choose(poLineData.orderFormat),
    Button('Add vendor reference number').click(),
    TextField('Vendor reference number*').fillIn(poLineData.vrn),
    Select('Vendor reference type*').choose(poLineData.vrnType),
    TextField({ name: 'cost.listUnitPrice' }).fillIn(poLineData.physicalUnitPrice),
    TextField({ name: 'cost.quantityPhysical' }).fillIn(poLineData.physicalUnitQuantity),
    Select({ name: 'physical.materialType' }).choose(poLineData.materialType),
    Button('Add location').click(),
    Selection('Name (code)*').open(),
    SelectionOption(poLineData.locationName).click(),
    TextField({ name: 'locations[0].quantityPhysical' }).fillIn(poLineData.quantityPhysical),
    Button('Save & close').click(),
  ]);
}

function goBackToPO() {
  cy.do(Button({ id: 'clickable-backToPO' }).click());
}

function openOrder() {
  cy.do([
    PaneHeader({ id: 'paneHeaderorder-details' }).find(Button('Actions')).click(),
    Button('Open').click(),
    Modal({ content: including('Open - purchase order') }).find(Button('Submit')).click()
  ]);
}

function verifyOrderStatus() {
  cy.expect(KeyValue('Workflow status').has({ value: 'Open' }));
}

function verifyReceivingPieces(value) {
  cy.do([
    Select({ id: 'input-record-search-qindex' }).choose('Package (POL Package name)'),
    TextField({ id: 'input-record-search' }).fillIn(value),
    Button('Search').click(),
  ]);

  cy.expect(MultiColumnListCell(value).exists());
}

function verifyInstanceHoldingItemCreated() {
  cy.do(MultiColumnListCell(including(poLineData.title)).click());
  cy.do(Link(poLineData.title).click());
  cy.expect(PaneHeader(including(poLineData.title)).exists());
}

function openMappingProfileForm() {
  cy.do([
    Button('Actions').click(),
    Button('New field mapping profile').click(),
  ]);
}

function closeMappingProfile() {
  cy.do(Button({ icon: 'times' }).click());
  cy.expect(PaneHeader('Field mapping profiles').find(Button('Actions')).exists());
}

function saveProfile() {
  cy.do(Button('Save as profile & Close').click());
}

const closeViewModeForMappingProfile = (profileName) => {
  cy.do(Pane({ title: profileName }).find(Button({ icon: 'times' })).click());
};

function creatMappingProfilesForInstance(name) {
  cy.intercept('GET', '/instance-statuses?*').as('getInstanceStatuses');
  openMappingProfileForm();
  return cy.do(Select('FOLIO record type*').choose('Instance'))
    .then(() => {
      cy.wait('@getInstanceStatuses');
    })
    .then(() => {
      cy.do([
        TextField('Name*').fillIn(name),
        Select('Incoming record type*').choose('MARC Bibliographic'),
        TextField('Cataloged date').fillIn('###TODAY###'),
        TextField('Instance status term').fillIn('"Batch Loaded"'),
      ]);
      saveProfile();
      closeViewModeForMappingProfile(name);
    });
}

function creatMappingProfilesForHoldings(name) {
  cy.intercept('GET', '/holdings-types?*').as('getHoldingsTypes');
  cy.intercept('GET', '/call-number-types?*').as('getCallNumberTypes');
  openMappingProfileForm();
  return cy.do(Select('FOLIO record type*').choose('Holdings'))
    .then(() => {
      cy.wait(['@getHoldingsTypes', '@getCallNumberTypes'], getLongDelay());
    })
    .then(() => {
      cy.do([
        TextField('Name*').fillIn(name),
        Select('Incoming record type*').choose('MARC Bibliographic'),
        TextField('Permanent').fillIn('980$a'),
        TextField('Call number').fillIn('980$b " " 980$c'),
        TextField('Holdings type').fillIn('"Monograph"'),
        TextField('Call number type').fillIn('"Library of Congress classification"'),
      ]);
      saveProfile();
      closeViewModeForMappingProfile(name);
    });
}

function creatMappingProfilesForItem(name) {
  openMappingProfileForm();
  return cy.do(Select('FOLIO record type*').choose('Item'))
    .then(() => {
      cy.wait(1000);
    })
    .then(() => {
      cy.do([
        TextField('Name*').fillIn(name),
        Select('Incoming record type*').choose('MARC Bibliographic'),
        TextField('Barcode').fillIn('981$b'),
        TextField('Copy number').fillIn('981$a'),
        TextField('Status').fillIn('"Available"'),
      ]);
      saveProfile();
      closeViewModeForMappingProfile(name);
    });
}

function closeTimesButton() {
  cy.do(Button({ icon: 'times' }).click());
}

function createActionProfileForVRN(name, recordType, mappingProfile, action) {
  cy.contains('Action profiles').should('be.visible');
  cy.do([
    PaneHeader('Action profiles').find(Button('Actions')).click(),
    Button('New action profile').click(),
    TextField('Name*').fillIn(name),
    Select('Action*').choose(action || 'Update (all record types except Orders)'),
    Select('FOLIO record type*').choose(recordType),
    Button('Link Profile').click(),
    Modal('Select Field Mapping Profiles').find(TextField({ name: 'query' })).fillIn(mappingProfile),
    Button('Search').click(),
    MultiColumnListCell(mappingProfile).click(),
  ]);
  cy.expect(Button('Link Profile').has({ disabled: true }));
  cy.do(Button('Save as profile & Close').click());

  closeTimesButton();
  cy.wait(1200);
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
}

function createMatchProfileForVRN({
  name,
  existingRecordType,
  field = '024',
  in1 = '8',
  in2 = '*',
  subfield = 'a'
}) {
  cy.wait(10000);
  cy.do([
    PaneHeader('Match profiles').find(Button('Actions')).click(),
    Button('New match profile').click(),
    TextField('Name*').fillIn(name),
  ]);

  cy.get(`[data-id="${existingRecordType}"]`).last().click();
  cy.do([
    TextField('Field').fillIn(field),
    TextField('In. 1').fillIn(in1),
    TextField('In. 2').fillIn(in2),
    TextField('Subfield').fillIn(subfield),
    Button({ id: 'criterion-value-type' }).click(),
  ]);
  cy.expect(SelectionList({ id: 'sl-container-criterion-value-type' }).exists());
  cy.do(SelectionList({ id: 'sl-container-criterion-value-type' }).select('Acquisitions data: Vendor reference number'));
  cy.wait(1200);
  cy.do(Button('Save as profile & Close').click());

  cy.intercept('POST', '/data-import-profiles/matchProfiles').as('createMatchProfile');
  cy.wait('@createMatchProfile');
  closeTimesButton();
}

function createJobProfileForVRN({ name, dataType, matches }) {
  cy.wait(3000);
  cy.do([
    PaneHeader('Job profiles').find(Button('Actions')).click(),
    Button('New job profile').click(),
    TextField('Name*').fillIn(name),
    Select('Accepted data type*').choose(dataType),
  ]);

  matches.forEach((match, i) => {
    NewJobProfile.linkMatchAndActionProfiles(match.matchName, match.actionName, 2 * i);
  });
  cy.do(Button('Save as profile & Close').click());
}

export default {
  poLineData,
  fillPOLineInfo,
  goBackToPO,
  openOrder,
  verifyOrderStatus,
  verifyInstanceHoldingItemCreated,
  verifyReceivingPieces,
  creatMappingProfilesForInstance,
  creatMappingProfilesForHoldings,
  creatMappingProfilesForItem,
  createActionProfileForVRN,
  createMatchProfileForVRN,
  waitJSONSchemasLoad,
  createJobProfileForVRN,
  openMappingProfileForm,
  closeMappingProfile,
  saveProfile,
};
