const manageProfileSettingsPage = "//div[@data-testid='manage-profile-settings']";
const profilesSection = "//div[@data-testid='profiles-list']";
const editorSection = "//div[@data-testid='profile-settings-editor']";

const saveAndCloseButton = "//button[@data-testid='save-and-close']";
const saveAndKeepEditingButton = "//button[@data-testid='save-and-keep-editing']";
const closeButton = "//button[@data-testid='nav-close-button']";

const preferredProfileCheckbox = "//input[@data-testid='type-default-setting']";
const defaultProfileSettingsRadio = "//input[@data-testid='settings-active-default']";
const customProfileSettingsRadio = "//input[@data-testid='settings-active-custom']";

const selectedList = "//div[@data-testid='selected-component-list']";
const unusedList = "//div[@data-testid='unused-component-list']";
const unusedContainer = "//div[@data-droppable-id='unused-container']";
const profileComponent = "div.component";
const componentActivateMenu = "//button[@data-testid='activate-menu']";
const componentMoveAction = "//button[@data-testid='move-action']";
const componentNudgeUp = "//button[@data-testid='nudge-up']";
const componentNudgeDown = "//button[@data-testid='nudge-down']";

const modalUnsaved = "//div[@data-testid='modal-close-profile-settings']";
const modalUnused = "//div[@data-testid='modal-save-unused-profile-components']";
const modalCloseButton = ".//button[@class='close-button']";
const modalCancelButton = ".//button[@data-testid='modal-button-cancel']";
const modalSubmitButton = ".//button[@data-testid='modal-button-submit']";
const loaderOverlay = "div.loader-overlay";

const component = (id, selector, sub) => {
  return `${sub ? '.' : ''}//div[@data-testid='component-${id}']${selector}`;
};

const center = (el) => {
  const r = el.getBoundingClientRect();
  return { x: Math.floor(r.left + r.width / 2), y: Math.floor(r.top + r.height / 2) };
};

const doDrag = (node, endCoords) => {
  // The dnd-kit DragOverlay makes things work more smoothly, but in
  // this context it adds an extra burden of replacing the original
  // object with the drag overlay, which may have a markedly different
  // position compared to the original object. We need to calculate
  // the difference between them in order to move the overlay over the
  // original start before finally moving to the target object. The
  // mouse pointer does not actually move, so we have to acquire the
  // position of the overlay to make the coordinate calculations.
  cy.wrap(node)
    .realMouseMove(0, 0, { position: 'center', steps: 6 })
    .realMouseDown({ button: 'left' })
    .realMouseMove(0, 1, { position: 'center', steps: 2 })
    .then(($el) => {
      const doc = $el[0].ownerDocument;
      const overlay = doc.querySelector('.drag-overlay')
      const ov = center(overlay);

      const dx = endCoords.x - ov.x;
      const dy = endCoords.y - ov.y;

      return { dx, dy };
    }).then(({ dx, dy }) => {
      cy.wrap(node)
        .realMouseMove(dx, dy, { position: 'center', steps: 14 })
        .wait(200)
        .realMouseUp({ button: 'left' });
    });
};

const dragDropGeneral = (dragTarget, dragTargetList, dropTarget) => {
  cy.xpath(dragTargetList)
    .xpath(component(dragTarget, '', true)).then((drag) => {
      cy.xpath(dropTarget).then((drop) => {
        const end = center(drop[0]);
        doDrag(drag, end);
      });
    });
};

const dragDropList = (dragTarget, dragTargetList, dropTarget, dropTargetList) => {
  cy.xpath(dragTargetList)
    .xpath(component(dragTarget, '', true)).then((drag) => {
      cy.xpath(dropTargetList)
        .xpath(component(dropTarget, '', true)).then((drop) => {
          const end = center(drop[0]);
          doDrag(drag, end);
        });
    });
};

const getComponentPosition = (id, list) => {
  return cy.xpath(list)
    .find(profileComponent)
    .then((els) => {
      const idx = els.toArray().findIndex((el) => {
        const val = el.getAttribute('data-testid');
        return val === `component-${id}`;
      });
      return idx;
    });
};

const getListLength = (list) => {
  return cy
    .xpath(list)
    .find(profileComponent)
    .its('length')
    .then((count) => {
      return count;
    });
}

const keyBackToStartingPosition = (list, listLength, initialPosition) => {
  // Keyboard interactions suffer from the same recalibrating overlay
  // position issue as mouse, and since the mouse isn't involved, it can't be
  // rectified in the same way with a coordinate diff caluclation. But
  // switching (non-required) fields between lists should return the horizontal
  // positioning, then resetting with up arrows to the top of the list
  // before finally using down arrows to reach the original position
  // should help put it into the correct original starting position.

  if (list === 'selected') {
    cy.realPress('ArrowLeft')
      .realPress('ArrowRight');
  } else if (list === 'unused') {
    cy.realPress('ArrowRight')
      .realPress('ArrowLeft');
  }

  Cypress._.times(listLength, () => cy.realPress('ArrowUp', { pressDelay: 100 }));
  Cypress._.times(initialPosition, () => cy.realPress('ArrowDown', { pressDelay: 100 }));
};

export default {
  waitMainLoading: () => {
    cy.xpath(manageProfileSettingsPage).should('be.visible');
    cy.xpath(saveAndCloseButton).should('be.disabled');
    cy.xpath(saveAndKeepEditingButton).should('be.disabled');
  },

  waitProfilesLoading: () => {
    cy.xpath(profilesSection).should('be.visible');
  },

  waitEditorLoading: () => {
    cy.xpath(editorSection).should('be.visible');
    cy.get(loaderOverlay).should('not.exist');
  },

  clickCloseButton: () => {
    cy.xpath(closeButton).should('be.visible');
    cy.do(cy.xpath(closeButton).click());
  },

  clickCloseButtonNoChanges: () => {
    cy.xpath(closeButton).should('be.visible');
    cy.do(cy.xpath(closeButton).click());
    cy.xpath(manageProfileSettingsPage).should('not.exist');
  },

  saveAndClose: () => {
    cy.xpath(saveAndCloseButton).should('be.visible').and('be.enabled');
    cy.do(cy.xpath(saveAndCloseButton).click());
  },

  saveAndKeepEditing: () => {
    cy.xpath(saveAndKeepEditingButton).should('be.visible').and('be.enabled');
    cy.do(cy.xpath(saveAndKeepEditingButton).click());
  },

  togglePreferredProfile: () => {
    cy.xpath(preferredProfileCheckbox).should('be.visible');
    cy.do(cy.xpath(preferredProfileCheckbox).click());
  },

  verifyPreferredProfile: (enabled) => {
    if (enabled) {
      cy.xpath(preferredProfileCheckbox).should('be.checked');
    } else {
      cy.xpath(preferredProfileCheckbox).should('not.be.checked');
    }
  },

  selectDefaultSettings: () => {
    cy.xpath(defaultProfileSettingsRadio).should('be.visible');
    cy.do(cy.xpath(defaultProfileSettingsRadio).click());
  },

  selectCustomSettings: () => {
    cy.xpath(customProfileSettingsRadio).should('be.visible');
    cy.do(cy.xpath(customProfileSettingsRadio).click());
  },

  verifyDefaultSettingsSelected: () => {
    cy.xpath(defaultProfileSettingsRadio).should('be.checked');
  },

  verifyCustomSettingsSelected: () => {
    cy.xpath(customProfileSettingsRadio).should('be.checked');
  },

  selectProfile: (name) => {
    cy.do(
      cy.contains('button', new RegExp(`^${name}$`))
        .scrollIntoView()
        .should('be.visible')
        .click(),
    );
  },

  moveComponentToOppositeListButton: (id) => {
    cy.do(
      cy.xpath(component(id, componentActivateMenu))
        .should('be.visible')
        .focus()
        .wait(100)
        .realClick(),
      cy.xpath(component(id, componentMoveAction))
        .should('be.visible')
        .focus()
        .wait(100)
        .realClick(),
    );
  },

  moveComponentUnavailable: (id) => {
    cy.xpath(component(id, componentActivateMenu))
      .should('be.visible')
      .focus()
      .wait(100)
      .realClick();
    cy.xpath(component(id, componentMoveAction))
      .should('not.exist')
  },

  nudgeComponentUpButton: (id) => {
    cy.do(
      cy.xpath(component(id, componentNudgeUp))
        .should('be.visible')
        .focus()
        .wait(100)  
        .realPress('Enter'),
    );
  },

  nudgeComponentDownButton: (id) => {
    cy.do(
      cy.xpath(component(id, componentNudgeDown))
        .should('be.visible')
        .focus()
        .wait(100)    
        .realPress('Enter'),
    );
  },

  verifySelectedComponent: (id) => {
    cy.xpath(selectedList).xpath(component(id, '', true)).should('exist');
  },

  verifySelectedComponentPosition: (id, position) => {
    cy.xpath(selectedList).find(profileComponent).eq(position-1)
      .invoke('attr', 'data-testid').should('eq', `component-${id}`);
    if (position === 1) {
      cy.xpath(component(id, componentNudgeUp))
        .should('not.exist');
    }
    cy.xpath(selectedList).find(profileComponent).its('length').then((length) => {
      if (position === length) {
        cy.xpath(component(id, componentNudgeDown))
          .should('not.exist');
      }
    });
  },

  verifyUnusedComponent: (id) => {
    cy.xpath(unusedList).xpath(component(id, '', true)).should('exist');
  },

  verifyUnusedComponentPosition: (id, position) => {
    cy.xpath(unusedList).find(profileComponent).eq(position-1)
      .invoke('attr', 'data-testid').should('eq', `component-${id}`);
  },

  dragUnusedComponentAndCancel: (position) => {
    cy.do(
      cy.xpath(unusedList)
        .find(profileComponent)
        .eq(position-1)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200),
      cy.realPress('Escape'),
    );
  },

  dragSelectedComponentAndCancel: (position) => {
    cy.do(
      cy.xpath(selectedList)
        .find(profileComponent)
        .eq(position-1)
        .realMouseDown({ button: 'left', position: 'center' })
        .realMouseMove(0, 10, { position: 'center' })
        .wait(200),
      cy.realPress('Escape'),
    );
  },

  dragReorderSelectedComponent: (id, targetId) => {
    dragDropList(id, selectedList, targetId, selectedList);
  },

  dragReorderUnusedComponent: (id, targetId) => {
    dragDropList(id, unusedList, targetId, unusedList);
  },

  dragSelectedToUnused: (id, targetId) => {
    dragDropList(id, selectedList, targetId, unusedList);
  },

  dragSelectedToUnusedContainer: (id) => {
    dragDropGeneral(id, selectedList, unusedContainer);
  },

  dragUnusedToSelected: (id, targetId) => {
    dragDropList(id, unusedList, targetId, selectedList);
  },

  dragSelectedToUndroppableRegion: (id) => {
    dragDropGeneral(id, selectedList, profilesSection);
  },

  dragUnusedToUndroppableRegion: (id) => {
    dragDropGeneral(id, unusedList, profilesSection);
  },

  keyboardDragUnusedComponentAndCancel: (position) => {
    cy.xpath(unusedList)
      .find(profileComponent)
      .eq(position-1)
      .focus()
      .wait(200),
    cy.realPress(' '),
    cy.realPress('ArrowDown'),
    cy.realPress('ArrowDown'),
    cy.realPress('Escape');
  },

  keyboardDragSelectedComponentAndCancel: (position) => {
    cy.xpath(selectedList)
      .find(profileComponent)
      .eq(position-1)
      .focus()
      .wait(200),
    cy.realPress(' '),
    cy.realPress('ArrowDown'),
    cy.realPress('ArrowDown'),
    cy.realPress('Escape');
  },

  keyboardDragReorderSelectedComponent: (id, targetId) => {
    getListLength(selectedList).then((length) => {
      getComponentPosition(id, selectedList).then((focusedPosition) => {
        getComponentPosition(targetId, selectedList).then((targetPosition) => {
          cy.xpath(selectedList)
            .xpath(component(id, '', true))
            .focus();
          cy.realPress(' ');
          keyBackToStartingPosition('selected', length, focusedPosition-1);
          if (focusedPosition < targetPosition) {
            Cypress._.times(targetPosition - focusedPosition-1, () => cy.realPress('ArrowDown', { pressDelay: 100 }));
          } else if (focusedPosition > targetPosition) {
            Cypress._.times(focusedPosition - targetPosition-1, () => cy.realPress('ArrowUp', { pressDelay: 100 }));
          }
          cy.realPress('Enter');
        });
      });
    });
  },

  keyboardDragReorderUnusedComponent: (id, targetId) => {
    getListLength(unusedList).then((length) => {
      getComponentPosition(id, unusedList).then((focusedPosition) => {
        getComponentPosition(targetId, unusedList).then((targetPosition) => {
          cy.xpath(unusedList)
            .xpath(component(id, '', true))
            .focus();
          cy.realPress(' ');
          keyBackToStartingPosition('unused', length, focusedPosition-1);
          if (focusedPosition < targetPosition) {
            Cypress._.times(targetPosition - focusedPosition-1, () => cy.realPress('ArrowDown', { pressDelay: 100 }));
          } else if (focusedPosition > targetPosition) {
            Cypress._.times(focusedPosition - targetPosition-1, () => cy.realPress('ArrowUp', { pressDelay: 100 }));
          }
          cy.realPress('Enter');
        });
      });
    });
  },

  keyboardDragSelectedToUnused: (id) => {
    getListLength(selectedList).then((length) => {
      getComponentPosition(id, selectedList).then((focusedPosition) => {
        cy.xpath(selectedList)
          .xpath(component(id, '', true))
          .focus();
        cy.realPress(' ');
        keyBackToStartingPosition('selected', length, focusedPosition);
        cy.realPress('ArrowLeft', { pressDelay: 100 });
        cy.realPress('Enter');
      });
    });
  },

  keyboardDragUnusedToSelected: (id, targetId) => {
    getListLength(unusedList).then((length) => {
      getComponentPosition(id, unusedList).then((focusedPosition) => {
        cy.xpath(unusedList)
          .xpath(component(id, '', true))
          .focus();
        cy.realPress(' ');
        keyBackToStartingPosition('unused', length, focusedPosition);
        cy.realPress('ArrowRight', { pressDelay: 100 });
        cy.realPress('Enter');
      });
    });
  },

  verifyModalUnsavedOpen: () => {
    cy.xpath(modalUnsaved).should('be.visible');
  },

  modalUnsavedClose: () => {
    cy.xpath(modalUnsaved)
      .xpath(modalCloseButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnsaved).should('not.exist');
  },

  modalUnsavedContinueWithoutSaving: () => {
    cy.xpath(modalUnsaved)
      .xpath(modalCancelButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnsaved).should('not.exist');
  },

  modalUnsavedContinueWithSaving: () => {
    cy.xpath(modalUnsaved)
      .xpath(modalSubmitButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnsaved).should('not.exist');
  },

  verifyModalUnusedOpen: () => {
    cy.xpath(modalUnused).should('be.visible');
  },

  modalUnusedClose: () => {
    cy.xpath(modalUnused)
      .xpath(modalCloseButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnused).should('not.exist')
  },

  modalUnusedCancel: () => {
    cy.xpath(modalUnused)
      .xpath(modalCancelButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnused).should('not.exist')
  },

  modalUnusedSave: () => {
    cy.xpath(modalUnused)
      .xpath(modalSubmitButton)
      .should('be.enabled')
      .click();
    cy.xpath(modalUnused).should('not.exist')
  },
};