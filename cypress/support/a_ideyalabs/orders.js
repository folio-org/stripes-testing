import { Button, Checkbox, Link, Modal, PaneContent, PaneHeader, Section } from "../../../interactors";


const ordersTab =  Button('Orders');
const ordersPane = PaneContent({id:"orders-filters-pane-content"});
const statusDropDown = Button('Status')
const openCheckBox = Checkbox('Open')
const pONumber = Link("21211");
const actionsBtn = Button('Actions');
const ordersSection = Section({id: "order-details"});
const paneHeaderorderDetails = PaneHeader({id:"paneHeaderorder-details"})
const orderDetailsActions = Section({id: "order-details-actions"})
const reExportBtn = Button("Re-export");
const reExportModal = Modal({id:"reexport-order-confirm-modal"})
const confirmButton = Button('Confirm');

export default{
    switchToOrders:()=>{
        cy.do(ordersPane.find(ordersTab).click())
    },
    status:()=>{
        cy.do([ordersPane.find(statusDropDown).click(),
        openCheckBox.click()]); 
    },
    poNumberRecord:()=>{
        cy.do(pONumber.click());
    },

    reExportActions() {
        cy.do([ordersSection.find(paneHeaderorderDetails).find(actionsBtn).click(),
        orderDetailsActions.find(reExportBtn).click()]);
    },

    reExportOrderModal: ()=>{
        cy.do(reExportModal.find(confirmButton).click())
    }
}