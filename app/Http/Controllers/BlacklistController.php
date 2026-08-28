<?php

namespace App\Http\Controllers;

use App\Models\Blacklist;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BlacklistController extends Controller
{
    public function index(): Response
    {
        $blacklists = Blacklist::with('creator:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('blacklists/index', [
            'blacklists' => $blacklists,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Hanya Admin yang dapat menambah data blacklist.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'nik' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'incident_date' => ['nullable', 'date'],
            'perpetrator_info' => ['nullable', 'string'],
            'blacklisted_by' => ['nullable', 'string', 'max:255'],
            'report_date' => ['nullable', 'date'],
            'evidence_photos' => ['nullable', 'array'],
            'evidence_photos.*' => ['nullable'],
        ]);

        $photoPaths = [];
        if ($request->hasFile('evidence_photos')) {
            foreach ($request->file('evidence_photos') as $file) {
                if ($file && $file->isValid()) {
                    $stored = $file->store('blacklists', 'public');
                    $photoPaths[] = Storage::url($stored);
                }
            }
        }

        Blacklist::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'nik' => $validated['nik'] ?? null,
            'address' => $validated['address'] ?? null,
            'incident_date' => $validated['incident_date'] ?? null,
            'perpetrator_info' => $validated['perpetrator_info'] ?? null,
            'blacklisted_by' => $validated['blacklisted_by'] ?? null,
            'report_date' => $validated['report_date'] ?? null,
            'evidence_photos' => $photoPaths,
            'created_by' => $request->user()?->id,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Data blacklist konsumen berhasil ditambahkan.',
        ]);

        return to_route('blacklists.index');
    }

    public function update(Request $request, Blacklist $blacklist): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Hanya Admin yang dapat mengubah data blacklist.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:50'],
            'nik' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string'],
            'incident_date' => ['nullable', 'date'],
            'perpetrator_info' => ['nullable', 'string'],
            'blacklisted_by' => ['nullable', 'string', 'max:255'],
            'report_date' => ['nullable', 'date'],
            'evidence_photos' => ['nullable', 'array'],
            'evidence_photos.*' => ['nullable'],
        ]);

        $existingPhotos = is_array($blacklist->evidence_photos) ? $blacklist->evidence_photos : [];

        // Check string URLs sent back
        $photoPaths = [];
        if ($request->has('evidence_photos') && is_array($request->input('evidence_photos'))) {
            foreach ($request->input('evidence_photos') as $p) {
                if (is_string($p) && ! empty($p)) {
                    $photoPaths[] = $p;
                }
            }
        } else {
            $photoPaths = $existingPhotos;
        }

        if ($request->hasFile('evidence_photos')) {
            foreach ($request->file('evidence_photos') as $file) {
                if ($file && $file->isValid()) {
                    $stored = $file->store('blacklists', 'public');
                    $photoPaths[] = Storage::url($stored);
                }
            }
        }

        $blacklist->update([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'nik' => $validated['nik'] ?? null,
            'address' => $validated['address'] ?? null,
            'incident_date' => $validated['incident_date'] ?? null,
            'perpetrator_info' => $validated['perpetrator_info'] ?? null,
            'blacklisted_by' => $validated['blacklisted_by'] ?? null,
            'report_date' => $validated['report_date'] ?? null,
            'evidence_photos' => array_values(array_unique($photoPaths)),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Data blacklist konsumen berhasil diperbarui.',
        ]);

        return to_route('blacklists.index');
    }

    public function destroy(Request $request, Blacklist $blacklist): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Hanya Admin yang dapat menghapus data blacklist.');
        }

        $blacklist->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Data blacklist konsumen berhasil dihapus.',
        ]);

        return to_route('blacklists.index');
    }

    public function import(Request $request): RedirectResponse
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Hanya Admin yang dapat mengimpor data blacklist.');
        }

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.name' => ['required'],
            'rows.*.phone' => ['required'],
            'rows.*.nik' => ['nullable'],
            'rows.*.address' => ['nullable'],
            'rows.*.incident_date' => ['nullable'],
            'rows.*.perpetrator_info' => ['nullable'],
            'rows.*.blacklisted_by' => ['nullable'],
            'rows.*.report_date' => ['nullable'],
        ]);

        $count = 0;
        foreach ($validated['rows'] as $row) {
            if (empty($row['name']) || empty($row['phone'])) {
                continue;
            }

            Blacklist::create([
                'name' => trim((string) $row['name']),
                'phone' => trim((string) $row['phone']),
                'nik' => ! empty($row['nik']) ? trim((string) $row['nik']) : null,
                'address' => ! empty($row['address']) ? trim((string) $row['address']) : null,
                'incident_date' => $this->parseDateValue($row['incident_date'] ?? null),
                'perpetrator_info' => ! empty($row['perpetrator_info']) ? trim((string) $row['perpetrator_info']) : null,
                'blacklisted_by' => ! empty($row['blacklisted_by']) ? trim((string) $row['blacklisted_by']) : null,
                'report_date' => $this->parseDateValue($row['report_date'] ?? null) ?? date('Y-m-d'),
                'created_by' => $request->user()?->id,
            ]);
            $count++;
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Berhasil mengimpor {$count} data blacklist konsumen dari file Excel.",
        ]);

        return to_route('blacklists.index');
    }

    private function parseDateValue(mixed $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        $valStr = trim((string) $value);

        // Excel serial date number e.g. 46244
        if (is_numeric($valStr) && (float) $valStr > 10000 && (float) $valStr < 100000) {
            try {
                $timestamp = round(((float) $valStr - 25569) * 86400);

                return Carbon::createFromTimestamp($timestamp)->format('Y-m-d');
            } catch (\Throwable $e) {
                // fallback
            }
        }

        try {
            return Carbon::parse($valStr)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
