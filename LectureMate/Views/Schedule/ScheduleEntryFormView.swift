import SwiftUI
import SwiftData

struct ScheduleEntryFormView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: ScheduleViewModel
    let classes: [LMClass]

    var body: some View {
        NavigationStack {
            Form {
                // Ders secimi
                Section("Ders") {
                    if classes.isEmpty {
                        Text("Henuz ders eklenmemis")
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Ders Sec", selection: $viewModel.selectedClassForEntry) {
                            Text("Sec...").tag(nil as LMClass?)
                            ForEach(classes) { classItem in
                                HStack {
                                    Circle()
                                        .fill(Color(hex: classItem.colorHex))
                                        .frame(width: 10, height: 10)
                                    Text(classItem.name)
                                }
                                .tag(classItem as LMClass?)
                            }
                        }
                    }

                    Button("Yeni Ders Ekle", systemImage: "plus.circle") {
                        viewModel.showingAddClass = true
                    }
                }

                // Yeni ders formu
                if viewModel.showingAddClass {
                    Section("Yeni Ders Bilgileri") {
                        TextField("Ders Adi", text: $viewModel.newClassName)
                        TextField("Hoca Adi (istege bagli)", text: $viewModel.newProfessorName)

                        // Renk secici
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(Color.classColors, id: \.self) { colorHex in
                                    Circle()
                                        .fill(Color(hex: colorHex))
                                        .frame(width: 30, height: 30)
                                        .overlay {
                                            if viewModel.newClassColor == colorHex {
                                                Image(systemName: "checkmark")
                                                    .font(.caption.bold())
                                                    .foregroundStyle(.white)
                                            }
                                        }
                                        .onTapGesture {
                                            viewModel.newClassColor = colorHex
                                        }
                                }
                            }
                        }

                        Button("Dersi Olustur") {
                            guard !viewModel.newClassName.isEmpty else { return }
                            let newClass = viewModel.addClass(modelContext: modelContext)
                            viewModel.selectedClassForEntry = newClass
                            viewModel.showingAddClass = false
                        }
                        .disabled(viewModel.newClassName.isEmpty)
                    }
                }

                // Gun secimi
                Section("Gun") {
                    Picker("Gun", selection: $viewModel.selectedDay) {
                        ForEach(ScheduleViewModel.weekDays, id: \.id) { day in
                            Text(day.name).tag(day.id)
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Saat secimi
                Section("Saat") {
                    DatePicker("Baslangic", selection: $viewModel.newStartTime, displayedComponents: .hourAndMinute)
                    DatePicker("Bitis", selection: $viewModel.newEndTime, displayedComponents: .hourAndMinute)
                }

                // Konum
                Section("Konum (istege bagli)") {
                    TextField("Ornek: A Blok 204", text: $viewModel.newLocation)
                }
            }
            .navigationTitle("Ders Ekle")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Iptal") {
                        viewModel.resetForm()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Kaydet") {
                        if let classRef = viewModel.selectedClassForEntry {
                            viewModel.addScheduleEntry(for: classRef, modelContext: modelContext)
                            dismiss()
                        }
                    }
                    .disabled(viewModel.selectedClassForEntry == nil)
                }
            }
        }
    }
}
