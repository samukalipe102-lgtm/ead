// Geração de PDF de certificado e boletim (preservado do protótipo original, jsPDF).
window.UmbandaPDF = {
  certificate(studentName, courseTitle, hours, certId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setLineWidth(2); doc.setDrawColor(45, 106, 79); doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.5); doc.setDrawColor(212, 175, 55); doc.rect(13, 13, 271, 184);
    doc.setFont('times', 'bold'); doc.setFontSize(26); doc.setTextColor(20, 54, 39);
    doc.text('FORMAÇÃO SACERDOTAL DE UMBANDA', 148, 45, { align: 'center' });
    doc.setFontSize(13); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
    doc.text('CERTIFICADO OFICIAL DE CONCLUSÃO E ESTUDOS RELIGIOSOS', 148, 55, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor(30, 30, 30);
    doc.text('Certificamos que, cumprindo todos os requisitos teóricos, práticos e éticos,', 148, 80, { align: 'center' });
    doc.setFontSize(22); doc.setFont('times', 'bold'); doc.setTextColor(180, 130, 10);
    doc.text(studentName.toUpperCase(), 148, 95, { align: 'center' });
    doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
    doc.text('concluiu com êxito os estudos e avaliações do curso', 148, 112, { align: 'center' });
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(20, 54, 39);
    doc.text(courseTitle, 148, 124, { align: 'center', maxWidth: 250 });
    doc.setFontSize(13); doc.setFont('helvetica', 'normal');
    doc.text('com Carga Horária Total de ' + hours + ' Horas.', 148, 140, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text('Código de Verificação Autêntica: ' + certId, 148, 165, { align: 'center' });
    doc.text('Emitido em: ' + new Date().toLocaleDateString('pt-BR'), 148, 172, { align: 'center' });
    doc.save('Certificado_' + studentName.replace(/\s+/g, '_') + '_' + hours + 'H.pdf');
  },
  bulletin(studentName, grades) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('times', 'bold'); doc.setFontSize(20); doc.setTextColor(20, 54, 39);
    doc.text('BOLETIM OFICIAL DE AVALIAÇÕES', 105, 25, { align: 'center' });
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text('Estudante: ' + studentName, 20, 40);
    doc.text('Data de Emissão: ' + new Date().toLocaleDateString('pt-BR'), 20, 46);
    let y = 60; doc.setFont('helvetica', 'bold');
    doc.text('Curso / Avaliação', 20, y); doc.text('Nota', 140, y); doc.text('Data', 170, y);
    doc.line(20, y + 2, 190, y + 2); y += 10; doc.setFont('helvetica', 'normal');
    grades.forEach((g) => {
      doc.text((g.course_title + ' - ' + g.assignment_name).slice(0, 70), 20, y);
      doc.text(g.score + ' / ' + g.max_score, 140, y);
      doc.text(String(g.date).slice(0, 10), 170, y); y += 10;
    });
    doc.save('Boletim_' + studentName.replace(/\s+/g, '_') + '.pdf');
  },
};
