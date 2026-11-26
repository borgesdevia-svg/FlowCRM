// Service worker do FlowCRM: só trata dos avisos de leads novos (web push).
// Não guarda páginas em cache: o CRM precisa sempre dos dados atuais.

// chegou um aviso do servidor (lib/avisosPush.js): mostra-o
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { titulo: "FlowCRM", texto: evento.data?.text() ?? "" };
  }
  evento.waitUntil(
    self.registration.showNotification(dados.titulo ?? "FlowCRM", {
      body: dados.texto ?? "",
      icon: "/icones/icone-192.png",
      data: { url: dados.url ?? "/painel" },
    }),
  );
});

// tocar no aviso: abre o lead (aproveita uma janela do FlowCRM já aberta, se houver)
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = new URL(evento.notification.data?.url ?? "/painel", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (new URL(janela.url).origin === self.location.origin && "navigate" in janela) {
          return janela.focus().then(() => janela.navigate(url));
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
