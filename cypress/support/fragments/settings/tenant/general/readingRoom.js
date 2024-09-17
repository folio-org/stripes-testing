import { Pane, Spinner } from '../../../../../../interactors';
import getRandomPostfix from '../../../../utils/stringTools';

const readingRoomRecordCss = 'div[id=editList-reading-room-access-settings]';
const settingsHeaderIconCss = 'a[id=ModuleMainHeading]';
const tenantReadingRoomOptionCss = 'nav[data-test-nav-list] a[href$=tenant-settings]';
const readingRoomPaneCss = 'nav[data-test-nav-list] a[href$=reading-room]';
const newRoomButtoncss = 'button[id^="clickable-add-reading-room"]';
const editRoomButtonCss = 'button[id^="clickable-edit-reading-room"]';
const deleteRoomCss = 'button[id^="clickable-delete-reading-room"]';

const servicePoint = 'Circ Desk 1';
const readingRoomName = `Autotest_Reading_Room${getRandomPostfix()}`;
const recordLoadRetries = 10;
const recordLoadWait = 15000;

export default {
  readingRoomName,
  loadReadingRoomRecord() {
    let retries = 0;

    function verifyRecordLoad() {
      cy.get('body').then(($body) => {
        if ($body.find(readingRoomRecordCss).length === 0 && retries < recordLoadRetries) {
          cy.get(settingsHeaderIconCss).click();
          cy.get(tenantReadingRoomOptionCss).click();
          cy.get(readingRoomPaneCss).click();
          cy.expect(Pane('Reading room access').exists());
          cy.expect(Spinner().exists());
          cy.expect(Spinner().absent());
          cy.wait(recordLoadWait);
          cy.then(() => {
            retries++;
          });
          verifyRecordLoad();
        }
      });
    }
    verifyRecordLoad();
  },
  verifyButtonsDisabled() {
    cy.get(newRoomButtoncss).should('not.exist');
    cy.get(editRoomButtonCss).should('not.exist');
    cy.get(deleteRoomCss).should('not.exist');
  },
  createReadingRoomViaApi(servicePointId, readingRoomId, publicState = true) {
    return cy.okapiRequest({
      method: 'POST',
      path: 'reading-room',
      body: {
        isPublic: publicState,
        name: `${readingRoomName}`,
        servicePoints: [
          {
            value: servicePointId,
            label: `${servicePoint}`,
          },
        ],
        id: readingRoomId,
      },
    });
  },
  deleteReadingRoomViaApi(readingRoomId) {
    return cy.okapiRequest({
      method: 'DELETE',
      path: `reading-room/${readingRoomId}`,
    });
  },
};
