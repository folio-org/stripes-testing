import uuid from 'uuid';
import { HTML, including } from '@interactors/html';
import {
  Button,
  MultiColumnListCell,
  PaneHeader,
  Section,
  TextField,
  Modal,
  Checkbox,
  Heading,
  Link,
} from '../../../../interactors';

const actionsButton = Button('Actions');
const saveAndCloseButton = Button({ id: 'clickable-save-request' });
const newRequestButton = Button('New Request');
const selectUserModal = Modal('Select User');
const loanAndAvailabilitySection = Section({ id: 'acc06' });

export default {
  createItemsForGivenStatusesApi() {
    let materialTypeValue = '';
    const instanceRecordData = {
      instanceTitle: `inst_title-${uuid()}`,
      instanceId: uuid(),
      holdingId: uuid(),
      instanceTypeId: null,
      holdingsTypeId: null,
      permanentLocationId: null,
      sourceId: null,
      permanentLoanTypeId: null,
      materialTypeId: null
    };

    return cy.wrap(Promise.resolve(true)).then(() => {
      cy.getMaterialTypes({ limit: 1 }).then(materialType => {
        instanceRecordData.materialTypeId = materialType.id;
        materialTypeValue = materialType.name;
      });
      cy.getLoanTypes({ limit: 1 }).then(loanTypes => {
        instanceRecordData.permanentLoanTypeId = loanTypes[0].id;
      });
      cy.getHoldingTypes({ limit: 1 }).then(holdingsTypes => {
        instanceRecordData.holdingsTypeId = holdingsTypes[0].id;
      });
      cy.getLocations({ limit: 1 }).then(location => {
        instanceRecordData.permanentLocationId = location.id;
      });
      cy.getHoldingSources({ limit: 1 }).then(holdingsSources => {
        instanceRecordData.sourceId = holdingsSources[0].id;
      });
      cy.getInstanceTypes({ limit: 1 }).then(instanceTypes => {
        instanceRecordData.instanceTypeId = instanceTypes[0].id;
      });
    }).then(() => {
      const item = {
        itemId: uuid(),
        barcode: uuid(),
        status: { name: 'Available' },
        permanentLoanType: { id: instanceRecordData.permanentLoanTypeId },
        materialType: { id: instanceRecordData.materialTypeId },
      };

      cy.createInstance({
        instance: {
          instanceId: instanceRecordData.instanceId,
          instanceTypeId: instanceRecordData.instanceTypeId,
          title: instanceRecordData.instanceTitle,
        },
        holdings: [{
          holdingId: instanceRecordData.holdingId,
          holdingsTypeId: instanceRecordData.holdingsTypeId,
          permanentLocationId: instanceRecordData.permanentLocationId,
          sourceId: instanceRecordData.sourceId,
        }],
        items: [[item]],
      });
      cy.wrap({ item, instanceRecordData, materialTypeValue });
    });
  },

  findAndOpenInstance(instanceTitle) {
    cy.do([
      TextField({ id: 'input-inventory-search' }).fillIn(instanceTitle),
      Button('Search').click(),
      MultiColumnListCell({ row: 0, column: instanceTitle }).click(),
    ]);
    cy.expect(Section({ id: 'pane-instancedetails' }).exists());
  },

  openHoldingsAccordion(holdingId) {
    cy.do(Button({ id: `accordion-toggle-button-${holdingId}` }).click());
  },

  openItem(itemBarcode) {
    cy.do(Link(itemBarcode).click());
  },

  clickNewRequest() {
    cy.do([actionsButton.click(), newRequestButton.click()]);
  },

  verifyItemStatus(status) {
    cy.expect(PaneHeader(including(status)).exists());
  },

  closeItemView() {
    cy.do(Button({ icon: 'times' }).click());
  },

  clickRequesterLookUp() {
    cy.do(Button('Requester look-up').click());
  },

  checkModalExists() {
    cy.expect(selectUserModal.exists());
  },

  filterRequesterLookup() {
    cy.do([
      Checkbox('faculty').click(),
      Checkbox('Active').click()
    ]);
  },

  selectUser(username) {
    cy.do([
      TextField({ name: 'query' }).fillIn(username),
      Button('Search').click(),
      MultiColumnListCell({ row: 0, column: username }).click(),
    ]);
  },

  selectPickupServicePoint() {
    cy.do(cy.get('[name="pickupServicePointId"]').select('Circ Desk 1'));
  },

  saveAndClose() {
    cy.do(saveAndCloseButton.click());
  },

  clickItemBarcodeLink(barcode) {
    cy.do(Link(barcode).click());
  },

  verifyPageTypeItem(barcode) {
    cy.expect(Heading({
      level: 2,
      text: `Item • ${barcode} • Paged`,
    }).exists());
  },

  deleteRequestApi(requestId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `circulation/requests/${requestId}`,
      isDefaultSearchParamsRequired: false,
    });
  },

  getRequestsCountLink() {
    let requestsCountLink;
    return cy.get(Section({ id: 'acc06' }).find(HTML('Requests')).perform(el => {
      requestsCountLink = el.parentElement.querySelector('a');
    })).then(() => requestsCountLink);
  },

  verifyrequestsCountLink() {
    this.getRequestsCountLink().then(requestsCountLink => {
      console.log(requestsCountLink);
      cy.expect(loanAndAvailabilitySection.find(HTML('Requests')).assert(el => {
        const count = el.parentElement.querySelector('a').textContent;
        return expect(+count).to.be.greaterThan(0);
      }));
    });
  },

  clickRequestsCountLink() {
    this.getRequestsCountLink().then(requestsCountLink => {
      cy.do(loanAndAvailabilitySection.find(HTML('Requests')).perform(el => {
        el.parentElement.querySelector('a').click();
      }));
      requestsCountLink.click();
    });
  }
};
