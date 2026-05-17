import { Injectable } from '@angular/core';
import * as pdfMakeModule from 'pdfmake/build/pdfmake';
import * as pdfFontsModule from 'pdfmake/build/fonts/Roboto';
import { CartItem } from './cart.service';
import { UserProfile } from './user.service';
import { TranslateService } from './translate.service';

const pdfMake = (pdfMakeModule as any).default || pdfMakeModule;
const pdfFonts = (pdfFontsModule as any).default || pdfFontsModule;
const hasAddFontContainer = typeof (pdfMake as any)?.addFontContainer === 'function';
const hasAddVirtualFileSystem = typeof (pdfMake as any)?.addVirtualFileSystem === 'function';
const pdfVfs = (pdfFonts as any)?.vfs ?? (pdfFonts as any)?.pdfMake?.vfs;

if (hasAddFontContainer && (pdfFonts as any)?.fonts && pdfVfs) {
  (pdfMake as any).addFontContainer(pdfFonts);
} else if (pdfVfs) {
  if (hasAddVirtualFileSystem) {
    (pdfMake as any).addVirtualFileSystem(pdfVfs);
  } else {
    pdfMake.vfs = pdfVfs;
  }
}

export interface TicketData {
  orderId: string;
  orderUsername: string;
  date: Date;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  user: UserProfile | null;
  paymentMethod: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(private readonly translateService: TranslateService) {}

  generateAndDownloadTicketPDF(ticketData: TicketData): void {
    const money = (amount: number) => this.translateService.formatCurrency(amount);

    const docDefinition: any = {
      content: [
        // Header
        {
          text: 'TICKET DE COMPRA',
          fontSize: 24,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10],
          color: '#d97706',
        },
        {
          text: 'CJ, Comidas Josepehs',
          fontSize: 12,
          alignment: 'center',
          color: '#666',
          margin: [0, 0, 0, 20],
        },

        // Información del Pedido
        {
          text: 'INFORMACIÓN DEL PEDIDO',
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 10],
          color: '#1f2937',
        },
        {
          columns: [
            {
              text: `Número de Pedido: ${ticketData.orderId}`,
              margin: [0, 0, 0, 5],
            },
            {
              text: `Fecha: ${this.formatDate(ticketData.date)}`,
              alignment: 'right',
              margin: [0, 0, 0, 5],
            },
          ],
          margin: [0, 0, 0, 15],
        },
        {
          text: `Usuario: @${ticketData.orderUsername}`,
          margin: [0, 0, 0, 12],
        },

        // Información del Cliente
        ...(ticketData.user
          ? [
              {
                text: 'INFORMACIÓN DEL CLIENTE',
                fontSize: 12,
                bold: true,
                margin: [0, 0, 0, 10],
                color: '#1f2937',
              },
              {
                text: `Nombre: ${ticketData.user.name}`,
                margin: [0, 0, 0, 5],
              },
              {
                text: `Email: ${ticketData.user.email}`,
                margin: [0, 0, 0, 5],
              },
              {
                text: `Teléfono: ${ticketData.user.phone}`,
                margin: [0, 0, 0, 5],
              },
              {
                text: `Dirección: ${ticketData.user.address}`,
                margin: [0, 0, 0, 15],
              },
            ]
          : []),

        // Tabla de Productos
        {
          text: 'ARTÍCULOS',
          fontSize: 12,
          bold: true,
          margin: [0, 0, 0, 10],
          color: '#1f2937',
        },
        {
          table: {
            headerRows: 1,
            widths: ['*', 80, 80, 100],
            body: [
              [
                {
                  text: 'Producto',
                  bold: true,
                  fillColor: '#f59e0b',
                  color: '#fff',
                  alignment: 'left',
                },
                {
                  text: 'Precio',
                  bold: true,
                  fillColor: '#f59e0b',
                  color: '#fff',
                  alignment: 'right',
                },
                {
                  text: 'Cantidad',
                  bold: true,
                  fillColor: '#f59e0b',
                  color: '#fff',
                  alignment: 'center',
                },
                {
                  text: 'Subtotal',
                  bold: true,
                  fillColor: '#f59e0b',
                  color: '#fff',
                  alignment: 'right',
                },
              ],
              ...ticketData.items.map((item) => [
                { text: item.name, alignment: 'left' },
                {
                  text: money(item.price),
                  alignment: 'right',
                },
                { text: item.quantity.toString(), alignment: 'center' },
                {
                  text: money(item.price * item.quantity),
                  alignment: 'right',
                },
              ]),
            ],
          },
          margin: [0, 0, 0, 20],
        },

        // Resumen de Totales
        {
          table: {
            widths: ['*', 120],
            body: [
              [
                { text: 'Subtotal:', bold: true, alignment: 'right' },
                { text: money(ticketData.subtotal), alignment: 'right' },
              ],
              ...(ticketData.discount > 0
                ? [
                    [
                      { text: 'Descuento:', bold: true, alignment: 'right', color: '#10b981' },
                      {
                        text: `-${money(ticketData.discount)}`,
                        alignment: 'right',
                        color: '#10b981',
                      },
                    ],
                  ]
                : []),
              ...(ticketData.shipping > 0
                ? [
                    [
                      { text: 'Envío:', bold: true, alignment: 'right' },
                      { text: money(ticketData.shipping), alignment: 'right' },
                    ],
                  ]
                : []),
              [
                { text: 'TOTAL:', bold: true, alignment: 'right', fontSize: 14, color: '#d97706' },
                {
                  text: money(ticketData.total),
                  alignment: 'right',
                  fontSize: 14,
                  bold: true,
                  color: '#d97706',
                },
              ],
            ],
          },
          margin: [0, 0, 0, 20],
        },

        // Método de Pago
        {
          text: `Método de Pago: ${ticketData.paymentMethod}`,
          fontSize: 11,
          margin: [0, 0, 0, 30],
          color: '#666',
        },

        // Footer
        {
          text: '¡Gracias por tu compra!',
          fontSize: 12,
          alignment: 'center',
          bold: true,
          margin: [0, 30, 0, 10],
          color: '#d97706',
        },
        {
          text: 'Comidas Josepehs',
          fontSize: 10,
          alignment: 'center',
          color: '#999',
        },
      ],
      styles: {
        defaultStyle: {
          font: 'Roboto',
        },
      },
      margin: [40, 40, 40, 40],
    };

    // Crear el PDF y descargarlo
    pdfMake.createPdf(docDefinition).download(`ticket-${ticketData.orderId}.pdf`);
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}
