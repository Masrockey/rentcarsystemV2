<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Resources\Api\V1\BlacklistResource;
use App\Models\Blacklist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

class BlacklistController extends BaseApiController
{
    private function checkAdmin(Request $request): void
    {
        if (! $request->user()?->isAdmin()) {
            abort(403, 'Akses ditolak. Halaman ini hanya untuk Admin.');
        }
    }

    /**
     * Display a listing of blacklists.
     */
    public function index(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

        $query = Blacklist::with('creator:id,name')->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('nik', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->query('per_page', 10);
        $blacklists = $query->paginate($perPage);

        return $this->sendResponse(
            BlacklistResource::collection($blacklists),
            'Daftar blacklist konsumen berhasil diambil.',
            200,
            [
                'current_page' => $blacklists->currentPage(),
                'last_page' => $blacklists->lastPage(),
                'per_page' => $blacklists->perPage(),
                'total' => $blacklists->total(),
            ]
        );
    }

    /**
     * Store a newly created blacklist record.
     */
    public function store(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

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

        $blacklist = Blacklist::create([
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

        return $this->sendResponse(new BlacklistResource($blacklist->load('creator')), 'Data blacklist konsumen berhasil ditambahkan.', 201);
    }

    /**
     * Display the specified blacklist record.
     */
    public function show(Request $request, Blacklist $blacklist): JsonResponse
    {
        $this->checkAdmin($request);

        return $this->sendResponse(new BlacklistResource($blacklist->load('creator')), 'Detail blacklist berhasil diambil.');
    }

    /**
     * Update the specified blacklist record.
     */
    public function update(Request $request, Blacklist $blacklist): JsonResponse
    {
        $this->checkAdmin($request);

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

        return $this->sendResponse(new BlacklistResource($blacklist->fresh()->load('creator')), 'Data blacklist konsumen berhasil diperbarui.');
    }

    /**
     * Remove the specified blacklist record.
     */
    public function destroy(Request $request, Blacklist $blacklist): JsonResponse
    {
        $this->checkAdmin($request);

        $blacklist->delete();

        return $this->sendResponse(null, 'Data blacklist konsumen berhasil dihapus.');
    }

    /**
     * Bulk import blacklist rows.
     */
    public function import(Request $request): JsonResponse
    {
        $this->checkAdmin($request);

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

        return $this->sendResponse(['imported_count' => $count], "Berhasil mengimpor {$count} data blacklist konsumen.");
    }

    private function parseDateValue(mixed $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        $valStr = trim((string) $value);

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
