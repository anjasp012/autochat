<?php

namespace App\Http\Requests;

use App\Models\Application;
use App\Models\SystemSetting;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Application $application */
        $application = $this->route('application');

        return [
            'app_id' => [
                'required',
                'string',
                'max:50',
                'alpha_dash:ascii',
                Rule::unique('applications', 'app_id')->ignore($application->id),
            ],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'system_prompt' => ['required', 'string', 'max:20000'],
            'model' => ['nullable', 'string', 'max:100'],
            'temperature' => ['nullable', 'numeric', 'between:0,2'],
            'max_tokens' => ['nullable', 'integer', 'between:64,8192'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        /** @var Application|null $application */
        $application = $this->route('application');

        $this->merge([
            'model' => $this->input('model') ?: ($application?->model ?? (SystemSetting::get('ai_model') ?: config('ai.model', 'Qwen3 1.7B Q4 GGUF'))),
            'temperature' => (float) ($this->input('temperature') ?? ($application?->temperature ?? 0.70)),
            'max_tokens' => (int) ($this->input('max_tokens') ?? ($application?->max_tokens ?? 2048)),
            'is_active' => $this->boolean('is_active', true),
        ]);
    }
}
