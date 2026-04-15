import SwiftUI
import SwiftData

struct ScheduleView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var entries: [LMScheduleEntry]
    @Query(sort: \LMClass.name) private var classes: [LMClass]
    @State private var viewModel = ScheduleViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Gun secici
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(ScheduleViewModel.weekDays, id: \.id) { day in
                            Button {
                                viewModel.selectedDay = day.id
                            } label: {
                                VStack(spacing: 4) {
                                    Text(day.short)
                                        .font(.caption.bold())
                                    Text("\(entriesCount(for: day.id))")
                                        .font(.caption2)
                                }
                                .frame(width: 50, height: 50)
                                .background(
                                    viewModel.selectedDay == day.id
                                        ? Color.lmPrimary
                                        : Color(.systemGray6)
                                )
                                .foregroundStyle(viewModel.selectedDay == day.id ? .white : .primary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                    }
                    .padding()
                }

                Divider()

                // Secili gunun programi
                let dayEntries = viewModel.entriesForSelectedDay(entries)
                if dayEntries.isEmpty {
                    Spacer()
                    EmptyStateView(
                        icon: "calendar.badge.plus",
                        title: "Program Bos",
                        message: "Bu gun icin ders eklemek icin + butonuna dokunun"
                    )
                    Spacer()
                } else {
                    List {
                        ForEach(dayEntries) { entry in
                            scheduleEntryRow(entry)
                        }
                        .onDelete { indexSet in
                            for index in indexSet {
                                viewModel.deleteEntry(dayEntries[index], modelContext: modelContext)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Ders Programi")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        viewModel.showingAddEntry = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showingAddEntry) {
                ScheduleEntryFormView(viewModel: viewModel, classes: classes)
            }
        }
    }

    private func scheduleEntryRow(_ entry: LMScheduleEntry) -> some View {
        HStack(spacing: 12) {
            // Zaman
            VStack {
                Text(entry.startTime.timeString)
                    .font(.subheadline.bold())
                Text(entry.endTime.timeString)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 50)

            // Renkli cizgi
            if let classRef = entry.classRef {
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color(hex: classRef.colorHex))
                    .frame(width: 4)
            }

            // Ders bilgisi
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.classRef?.name ?? "Ders")
                    .font(.headline)

                if let prof = entry.classRef?.professorName {
                    Text(prof)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let location = entry.location {
                    Label(location, systemImage: "location")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Kayit sayisi
            if let classRef = entry.classRef, !classRef.recordings.isEmpty {
                NavigationLink {
                    ClassDetailView(classRef: classRef)
                } label: {
                    VStack {
                        Text("\(classRef.recordings.count)")
                            .font(.caption.bold())
                        Text("kayit")
                            .font(.caption2)
                    }
                    .foregroundStyle(.lmPrimary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private func entriesCount(for day: Int) -> Int {
        entries.filter { $0.dayOfWeek == day }.count
    }
}
